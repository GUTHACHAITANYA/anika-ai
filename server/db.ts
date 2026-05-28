import Database from "better-sqlite3";

const db = new Database("anika.db");
db.pragma("journal_mode = WAL");

// Migration
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL,
    reset_key TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS budget_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default_user',
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    note TEXT,
    date TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default_user',
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    budget_limit REAL DEFAULT 10000,
    lifestyle_info TEXT,
    emergency_target REAL DEFAULT 5000,
    emergency_saved REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS security_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    ip_address TEXT,
    details TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default_user',
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT DEFAULT 'Entertainment',
    active INTEGER DEFAULT 1,
    billing_date TEXT
  );

  CREATE TABLE IF NOT EXISTS ai_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default_user',
    key_text TEXT,
    value_text TEXT NOT NULL,
    last_updated TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, key_text)
  );

  CREATE TABLE IF NOT EXISTS goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default_user',
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    saved_amount REAL NOT NULL DEFAULT 0,
    category TEXT,
    deadline TEXT,
    roadmap TEXT
  );

  CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default_user',
    name TEXT NOT NULL,
    upi_id TEXT
  );

  CREATE TABLE IF NOT EXISTS group_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT DEFAULT 'default_user',
    group_name TEXT NOT NULL,
    members TEXT NOT NULL, -- JSON string of arrays
    balances TEXT NOT NULL -- JSON string of net balances / ledger
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    total REAL NOT NULL,
    date TEXT NOT NULL,
    ocr_upload_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS ocr_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    file_path TEXT,
    raw_text TEXT,
    structured_data TEXT,
    confidence REAL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settlements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    expense_id INTEGER NOT NULL,
    from_participant TEXT NOT NULL,
    to_participant TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending'
  );

  CREATE TABLE IF NOT EXISTS "groups" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    members TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT DEFAULT 'monthly'
  );

  CREATE TABLE IF NOT EXISTS ai_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    generated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata TEXT,
    timestamp TEXT DEFAULT (datetime('now'))
  );
`);

// Dynamic column migrations for existing databases
try {
  db.exec("ALTER TABLE user_profiles ADD COLUMN emergency_target REAL DEFAULT 5000");
} catch (e) {}
try {
  db.exec("ALTER TABLE user_profiles ADD COLUMN emergency_saved REAL DEFAULT 0");
} catch (e) {}
try {
  db.exec("ALTER TABLE ocr_uploads ADD COLUMN status TEXT DEFAULT 'processing'");
} catch (e) {}
try {
  db.exec("ALTER TABLE ocr_uploads ADD COLUMN error_message TEXT");
} catch (e) {}

// Dynamic migration for ai_memories global key unique constraint to per-user compound key
try {
  const schemaInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ai_memories'").get() as any;
  if (schemaInfo && schemaInfo.sql.includes("key_text TEXT UNIQUE")) {
    console.log("[MIGRATION] UPGRADING: Migrating ai_memories table structure from global unique constraint to user-isolated compound index...");
    
    // Rename
    db.exec("ALTER TABLE ai_memories RENAME TO old_ai_memories");
    
    // Create new structure
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT DEFAULT 'default_user',
        key_text TEXT,
        value_text TEXT NOT NULL,
        last_updated TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, key_text)
      );
    `);
    
    // Move records safely
    db.exec(`
      INSERT OR IGNORE INTO ai_memories (user_id, key_text, value_text, last_updated)
      SELECT user_id, key_text, value_text, last_updated FROM old_ai_memories
    `);
    
    // Drop old
    db.exec("DROP TABLE old_ai_memories");
    console.log("[MIGRATION] UPGRADE SUCCESSFUL: ai_memories compound index is fully configured!");
  }
} catch (e) {
  console.error("[MIGRATION] Migration warning for ai_memories table:", e);
}

export default db;
