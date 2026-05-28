import db from "./db";

export function getUserId(req: any): string {
  const authHeader = req.headers['authorization'] || req.headers['x-user-id'];
  let rawToken = "";
  if (authHeader) {
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.substring(7).trim();
    } else {
      rawToken = String(authHeader).trim();
    }
  }

  if (!rawToken || rawToken === "default_user") {
    return 'default_user';
  }

  // 1. Look up rawToken inside our sessions database
  try {
    const session = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND datetime('now') < expires_at").get(rawToken) as any;
    if (session) {
      return session.user_id;
    }
  } catch (err) {
    console.error("Session lookup error in getUserId:", err);
  }

  return 'default_user';
}
