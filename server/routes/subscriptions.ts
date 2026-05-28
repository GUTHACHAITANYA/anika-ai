import { Router } from "express";
import db from "../db";
import { getUserId } from "../utils";

const router = Router();

// Get all subscriptions
router.get("/", (req, res) => {
  const userId = getUserId(req);
  const subs = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY id DESC").all(userId);
  res.json(subs);
});

// Create new subscription
router.post("/", (req, res) => {
  const userId = getUserId(req);
  const { name, amount, category, active, billing_date } = req.body;
  const info = db.prepare(
    "INSERT INTO subscriptions (user_id, name, amount, category, active, billing_date) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, name, amount, category || 'Entertainment', active !== undefined ? active : 1, billing_date || '');
  res.json({ id: info.lastInsertRowid });
});

// Update/Toggle active state or other fields of subscription
router.put("/:id", (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { name, amount, category, active, billing_date } = req.body;
  
  // Dynamic update depending on fields provided
  db.prepare(`
    UPDATE subscriptions 
    SET name = COALESCE(?, name),
        amount = COALESCE(?, amount),
        category = COALESCE(?, category),
        active = COALESCE(?, active),
        billing_date = COALESCE(?, billing_date)
    WHERE id = ? AND user_id = ?
  `).run(name, amount, category, active, billing_date, id, userId);

  res.json({ status: "updated" });
});

// Delete subscription
router.delete("/:id", (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  db.prepare("DELETE FROM subscriptions WHERE id = ? AND user_id = ?").run(id, userId);
  res.json({ status: "deleted" });
});

export default router;
