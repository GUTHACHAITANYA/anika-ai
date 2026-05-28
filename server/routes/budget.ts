import { Router } from "express";
import db from "../db";
import { getUserId } from "../utils";

const router = Router();

router.get("/", (req, res) => {
  const userId = getUserId(req);
  const logs = db.prepare("SELECT * FROM budget_logs WHERE user_id = ? ORDER BY date DESC").all(userId);
  res.json(logs);
});

router.post("/", (req, res) => {
  const userId = getUserId(req);
  const { amount, category, note } = req.body;
  const info = db.prepare("INSERT INTO budget_logs (user_id, amount, category, note) VALUES (?, ?, ?, ?)")
    .run(userId, amount, category, note);
  res.json({ id: info.lastInsertRowid });
});

router.put("/:id", (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { amount, category, note } = req.body;
  db.prepare("UPDATE budget_logs SET amount = ?, category = ?, note = ? WHERE id = ? AND user_id = ?")
    .run(amount, category, note, id, userId);
  res.json({ success: true });
});

router.delete("/:id", (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  db.prepare("DELETE FROM budget_logs WHERE id = ? AND user_id = ?")
    .run(id, userId);
  res.json({ success: true });
});

export default router;
