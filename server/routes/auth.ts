import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import db from "../db";
import { getUserId } from "../utils";

const router = Router();

// In-Memory Secure OTP Cache (expires after 5 minutes naturally)
const otpCache = new Map<string, { code: string; expiresAt: number; attempts?: number; lastSentAt?: number }>();

// Micro IP/Session Rate Limiting Cache to prevent brute-forcing
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(req: any, res: any, next: any) {
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  const now = Date.now();
  const cached = rateLimits.get(ip);

  if (cached) {
    if (now > cached.resetTime) {
      rateLimits.set(ip, { count: 1, resetTime: now + 60 * 1000 });
      return next();
    } else {
      cached.count += 1;
      if (cached.count > 25) { // Maximum 25 auth-related requests per minute per IP
        return res.status(429).json({ error: "Too many login/verification requests. Please cooldown for 1 minute." });
      }
    }
  } else {
    rateLimits.set(ip, { count: 1, resetTime: now + 60 * 1000 });
  }
  next();
}

// Attach rate-limiter middleware of protection
router.use(rateLimiter);

// 1. Password Security Utilities
function generate_password_hash(password: string, method: string = "pbkdf2:sha256", saltLength: number = 16): string {
  const salt = crypto.randomBytes(saltLength / 2).toString("hex");
  let iterations = 260000;
  if (method.includes(":")) {
    const parts = method.split(":");
    if (parts.length > 2) {
      iterations = parseInt(parts[2], 10) || iterations;
    }
  }
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2:sha256:${iterations}$${salt}$${hash}`;
}

function check_password_hash(storedHash: string, password: string): boolean {
  if (!storedHash) return false;

  // Modern Werkzeug PBKDF2 sha256 formatted: pbkdf2:sha256:iterations$salt$hash or pbkdf2:sha256$salt$hash
  if (storedHash.startsWith("pbkdf2:sha256:") || storedHash.startsWith("pbkdf2:sha256$")) {
    const parts = storedHash.split("$");
    if (parts.length === 3) {
      const header = parts[0];
      const salt = parts[1];
      const hash = parts[2];
      const headerParts = header.split(":");
      const iterations = headerParts.length === 3 ? parseInt(headerParts[2], 10) : 260500;
      try {
        const computedHash = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
        return crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(hash, "hex"));
      } catch (e) {
        console.error("PBKDF2 verification failed:", e);
        return false;
      }
    }
  }

  // Supporting scrypt as fallback
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split("$");
    if (parts.length === 3) {
      const header = parts[0]; // "scrypt:32768:8:1"
      const salt = parts[1];
      const hash = parts[2];
      const headerParts = header.split(":");
      const n = parseInt(headerParts[1], 10) || 32768;
      const r = parseInt(headerParts[2], 10) || 8;
      const p = parseInt(headerParts[3], 10) || 1;
      try {
        const computedHash = crypto.scryptSync(password, salt, r, { N: n, r, p, maxmem: 128 * 1024 * 1024 }).toString("hex");
        if (computedHash.length === hash.length) {
          return crypto.timingSafeEqual(Buffer.from(computedHash, "hex"), Buffer.from(hash, "hex"));
        }
      } catch (e) {
        console.error("scrypt verification failed:", e);
      }
    }
  }

  // Modern verification: check if stored format matches bcrypt
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$") || storedHash.startsWith("$2y$")) {
    try {
      return bcrypt.compareSync(password, storedHash);
    } catch (e) {
      console.error("[SECURITY] bcrypt comparison failed:", e);
      return false;
    }
  }

  // Backward compatibility: SHA-256 hashed password migration
  const sha256Hash = crypto.createHash("sha256").update(password).digest("hex");
  if (storedHash === sha256Hash) {
    return true;
  }

  // Backward compatibility: Plaintext password migration
  if (storedHash === password) {
    return true;
  }

  return false;
}

// Keep original names as simple wrappers inside our system
function hashPassword(password: string): string {
  return generate_password_hash(password);
}

function verifyPassword(password: string, storedHash: string): boolean {
  return check_password_hash(storedHash, password);
}

// Helper to log security incidents/events
function logSecurityEvent(userId: string, action: string, req: any, details?: string) {
  try {
    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    db.prepare("INSERT INTO security_logs (user_id, action, ip_address, details) VALUES (?, ?, ?, ?)")
      .run(userId, action, ip, details || "");
  } catch (err) {
    console.error("Failed to insert security log entry:", err);
  }
}

// 2. Session Management
function createSessionToken(userId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24-hour expiration duration
  
  // Save to the database
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .run(token, userId, expiresAt);
  
  return token;
}

function generateResetKey(): string {
  return "ANIKA-RESET-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

// 1. Send OTP (Mobile / Email)
router.post("/otp-send", (req, res) => {
  const { target } = req.body; 
  if (!target || target.trim().length === 0) {
    return res.status(400).json({ error: "Enter valid email or mobile number" });
  }

  const rawTarget = target.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const mobileRegex = /^[6-9]\d{9}$/;

  let isEmail = rawTarget.includes("@");
  let cleanTarget = "";

  if (isEmail) {
    if (!emailRegex.test(rawTarget)) {
      return res.status(400).json({ error: "Enter valid email or mobile number" });
    }
    cleanTarget = rawTarget.toLowerCase();
  } else {
    // Normalize mobile: remove spaces, plus, hyphens, parenthesis, and prefixes (+91 or 0)
    const normalizedMobile = rawTarget.replace(/[\s\-()+\c]/g, "").replace(/^(91|0)/, "");
    if (!mobileRegex.test(normalizedMobile)) {
      return res.status(400).json({ error: "Enter valid email or mobile number" });
    }
    cleanTarget = normalizedMobile;
  }

  // Resend cooldown checks (30s)
  const cachedOtp = otpCache.get(cleanTarget);
  if (cachedOtp && cachedOtp.lastSentAt && (Date.now() - cachedOtp.lastSentAt < 30 * 1000)) {
    const elapsed = Math.ceil((30 * 1000 - (Date.now() - cachedOtp.lastSentAt)) / 1000);
    return res.status(429).json({ error: `Please wait ${elapsed} seconds before requesting a new OTP.` });
  }

  // Create secure 6-digit verification pin
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins
  
  otpCache.set(cleanTarget, { code: pin, expiresAt, attempts: 0, lastSentAt: Date.now() });

  console.log(`[STDOUT DEV SYSTEM ALERT] Generated OTP for user "${cleanTarget}": ${pin}`);

  logSecurityEvent(cleanTarget, "OTP Requested", req, "Secure AI OTP pin code generated and sent");

  res.json({
    success: true,
    message: `Secure AI-OTP has been generated and sent to ${cleanTarget}! Check your server console logs.`
  });
});

// 2. Verify OTP Login (creates account automatically if user doesn't exist yet)
router.post("/otp-verify", (req, res) => {
  const { target, code } = req.body;
  if (!target || !code) {
    return res.status(400).json({ error: "Missing mobile/email or verification OTP" });
  }

  const rawTarget = target.trim();
  let cleanTarget = rawTarget.toLowerCase();
  
  if (!rawTarget.includes("@")) {
    cleanTarget = rawTarget.replace(/[\s\-()+\c]/g, "").replace(/^(91|0)/, "");
  }

  const cachedOtp = otpCache.get(cleanTarget);

  if (!cachedOtp) {
    logSecurityEvent(cleanTarget, "OTP Verification Failed", req, "Attempted to verify OTP but none was active");
    return res.status(400).json({ error: "No active OTP generated for this target" });
  }

  if (Date.now() > cachedOtp.expiresAt) {
    otpCache.delete(cleanTarget);
    logSecurityEvent(cleanTarget, "OTP Verification Failed", req, "OTP login attempt failed: confirmation code expired");
    return res.status(400).json({ error: "OTP expired. Please request a new code." });
  }

  const attemptsCounter = cachedOtp.attempts || 0;
  if (attemptsCounter >= 3) {
    otpCache.delete(cleanTarget);
    logSecurityEvent(cleanTarget, "OTP Verification Failed", req, "OTP verification blocked: too many failed attempts");
    return res.status(403).json({ error: "Too many failed attempts. This OTP has been invalidated. Please request a new one." });
  }

  if (cachedOtp.code !== code.trim()) {
    const nextAttempts = attemptsCounter + 1;
    cachedOtp.attempts = nextAttempts;
    otpCache.set(cleanTarget, cachedOtp); // Save updated attempts back to cache

    logSecurityEvent(cleanTarget, "OTP Verification Failed", req, `OTP login attempt failed: incorrect code provided. Attempt ${nextAttempts}/3`);
    
    if (nextAttempts >= 3) {
      otpCache.delete(cleanTarget);
      return res.status(403).json({ error: "Too many failed attempts. This OTP has been invalidated. Please request a new one." });
    } else {
      return res.status(400).json({ error: `Verification code incorrect. Please try again. (${3 - nextAttempts} attempts remaining)` });
    }
  }

  // Clear OTP on successful validation
  otpCache.delete(cleanTarget);

  try {
    let user = db.prepare("SELECT * FROM users WHERE id = ?").get(cleanTarget) as any;
    let resetKey = "";
    let actionLabel = "Secure OTP Login Success";
    
    if (!user) {
      // Auto-register on verification login
      resetKey = generateResetKey();
      // Store modern hashed dummy password in database
      const pwHash = hashPassword("anika_otp_dummy_pass_" + crypto.randomBytes(8).toString("hex"));
      db.prepare("INSERT INTO users (id, password_hash, reset_key) VALUES (?, ?, ?)")
        .run(cleanTarget, pwHash, resetKey);

      // Seed profile
      db.prepare("INSERT OR IGNORE INTO user_profiles (user_id, budget_limit) VALUES (?, 10000)")
        .run(cleanTarget);
      
      actionLabel = "Secure OTP Signup Success";
    } else {
      resetKey = user.reset_key;
    }

    // Generate active session token
    const token = createSessionToken(cleanTarget);

    logSecurityEvent(cleanTarget, actionLabel, req, `Successfully authenticated with AI-OTP. Created secure session token.`);

    res.json({
      success: true,
      username: cleanTarget,
      resetKey,
      token,
      message: "Successfully signed in via secure AI-OTP"
    });
  } catch (err: any) {
    console.error("OTP login verify database error:", err);
    res.status(500).json({ error: "Registration/Verification pipeline failed" });
  }
});

// 3. Initiate Forgot Password Recovery Flow with OTP
router.post("/otp-recover-initiate", (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username/Email/Phone is required to recover" });
  }

  // Normalize email/identifier
  const cleanUsername = username.trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(cleanUsername);
  
  if (!user) {
    logSecurityEvent(cleanUsername, "Password Reset Failed", req, "Attempted to initiate password reset via OTP but username does not exist");
    return res.status(404).json({ error: "No user account detected for this contact" });
  }

  // Set recovery OTP code
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;
  otpCache.set("recover_" + cleanUsername, { code: pin, expiresAt });

  console.log(`[STDOUT DEV RECOVERY ALERT] Generated recovery password OTP for ${cleanUsername}: ${pin}`);

  logSecurityEvent(cleanUsername, "Password Reset Initiated", req, "Triggered recovery OTP request");

  res.json({
    success: true,
    message: "Recovery password code generated successfully. Check your server console logs."
  });
});

// 4. Reset Password with Recovery OTP Code
router.post("/otp-recover-verify", (req, res) => {
  const { username, code, new_password } = req.body;
  if (!username || !code || !new_password) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // Normalize email/identifier
  const cleanUsername = username.trim().toLowerCase();
  const cachedOtp = otpCache.get("recover_" + cleanUsername);

  if (!cachedOtp) {
    logSecurityEvent(cleanUsername, "Password Reset Failed", req, "Attempted to reset password with OTP but no recovery session found");
    return res.status(400).json({ error: "Invalid or expired recovery session" });
  }

  if (cachedOtp.code !== code.trim()) {
    logSecurityEvent(cleanUsername, "Password Reset Failed", req, "Password reset attempt failed: recovery OTP code incorrect");
    return res.status(400).json({ error: "Invalid password recovery OTP" });
  }

  // Clear memory
  otpCache.delete("recover_" + cleanUsername);

  try {
    // Save as modern hashed password
    const newHash = generate_password_hash(new_password);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, cleanUsername);

    logSecurityEvent(cleanUsername, "Password Reset Success", req, "Password successfully updated using recovery OTP code verification");

    res.json({
      success: true,
      message: "Password successfully updated! Proceed to log in."
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || "Failed updating password index" });
  }
});

// 5. Register User
router.post("/register", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // Filter and normalize email/user context
  const cleanUsername = username.trim().toLowerCase();
  
  try {
    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(cleanUsername);
    if (existing) {
      logSecurityEvent(cleanUsername, "Signup Attempt Failed", req, "Registration failed: username is already taken");
      return res.status(400).json({ error: "Username already exists" });
    }

    const resetKey = generateResetKey();
    // Modern hashed password using standard Werkzeug pbkdf2:sha256
    const pwHash = generate_password_hash(password);

    db.prepare("INSERT INTO users (id, password_hash, reset_key) VALUES (?, ?, ?)")
      .run(cleanUsername, pwHash, resetKey);

    // Seed profile
    db.prepare("INSERT OR IGNORE INTO user_profiles (user_id, budget_limit) VALUES (?, 10000)")
      .run(cleanUsername);

    // Create session token for automatic login
    const token = createSessionToken(cleanUsername);

    logSecurityEvent(cleanUsername, "Signup Success", req, "New standard account registered and authenticated successfully");

    res.json({
      success: true,
      username: cleanUsername,
      resetKey,
      token,
      message: "Account created successfully"
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// 6. Login User with Secure Verification & Automatic Migration
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // Normalize email/identifier to lower_case
  const cleanUsername = username.trim().toLowerCase();

  try {
    const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(cleanUsername);
    if (!user) {
      logSecurityEvent(cleanUsername, "Login Failed", req, "Login attempt failed: user id not found in database");
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Modern multi-tier pw verification using werkzeug standard check_password_hash
    if (!check_password_hash(user.password_hash, password)) {
      logSecurityEvent(cleanUsername, "Login Failed", req, "Login attempt failed: incorrect password provided");
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Auto-migrate to secure modern Werkzeug PBKDF2 hash if existing db record is plain-text, bcrypt, or SHA256
    const isWerkzeug = user.password_hash.startsWith("pbkdf2:sha256:");
    if (!isWerkzeug) {
      try {
        const modernHash = generate_password_hash(password);
        db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(modernHash, cleanUsername);
        console.log(`[AUTH SYSTEM ADAPTER] Successfully migrated credentials storage schema to Werkzeug format for user: ${cleanUsername}`);
      } catch (errMigration) {
        console.error("Failed executing passive hash migration for user:", cleanUsername, errMigration);
      }
    }

    // Create secure session token
    const token = createSessionToken(cleanUsername);

    logSecurityEvent(cleanUsername, "Login Success", req, "Login authenticated successfully. Created secure session token.");

    res.json({
      success: true,
      username: cleanUsername,
      resetKey: user.reset_key,
      token,
      message: "Logged in successfully"
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to log in" });
  }
});

// 7. Reset Password using Reset Key
router.post("/recover-password", (req, res) => {
  const { username, reset_key, new_password } = req.body;
  if (!username || !reset_key || !new_password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Normalize
  const cleanUsername = username.trim().toLowerCase();
  const cleanResetKey = reset_key.trim().toUpperCase();

  try {
    const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(cleanUsername);
    if (!user) {
      logSecurityEvent(cleanUsername, "Password Reset Failed", req, "Attempted to use Reset Key recovery but username is not found");
      return res.status(444).json({ error: "User account matching identifier not found" });
    }

    if (user.reset_key.trim().toUpperCase() !== cleanResetKey) {
      logSecurityEvent(cleanUsername, "Password Reset Failed", req, "Master Reset Key authentication failed: invalid secret key used");
      return res.status(401).json({ error: "Invalid recovery reset key specified" });
    }

    // Save with modern Werkzeug pbkdf2
    const newHash = generate_password_hash(new_password);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, cleanUsername);

    logSecurityEvent(cleanUsername, "Password Reset Success", req, "Password successfully reset using recovery Master Reset Key");

    res.json({
      success: true,
      message: "Password reset completed successfully. You can now log in!"
    });
  } catch (err: any) {
    console.error("Password recovery failure:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// 8. Regenerate/Reset the Secret Reset Key
router.post("/reset-key", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required to reset key" });
  }

  // Normalize
  const cleanUsername = username.trim().toLowerCase();

  try {
    const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(cleanUsername);
    if (!user) {
      logSecurityEvent(cleanUsername, "Reset Key Regen Failed", req, "Reset Key regeneration failed: User not found");
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Verify password check
    if (!check_password_hash(user.password_hash, password)) {
      logSecurityEvent(cleanUsername, "Reset Key Regen Failed", req, "Reset Key regeneration failed: Incorrect password used");
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const newResetKey = generateResetKey();
    db.prepare("UPDATE users SET reset_key = ? WHERE id = ?").run(newResetKey, cleanUsername);

    logSecurityEvent(cleanUsername, "Reset Key Regen Success", req, "Master Reset Recovery Key successfully updated");

    res.json({
      success: true,
      resetKey: newResetKey,
      message: "Your Recovery Reset Key has been updated successfully!"
    });
  } catch (err: any) {
    console.error("Reset key error:", err);
    res.status(500).json({ error: "Failed to regenerate key" });
  }
});

// 9. Get recent security logging activity
router.get("/security-logs", (req, res) => {
  const userId = getUserId(req);
  if (!userId || userId === "default_user") {
    return res.json([]);
  }
  try {
    const logs = db.prepare("SELECT * FROM security_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100").all(userId);
    res.json(logs);
  } catch (err: any) {
    console.error("Failed fetching security logs:", err);
    res.status(500).json({ error: "Failed to retrieve security logs" });
  }
});

export default router;
