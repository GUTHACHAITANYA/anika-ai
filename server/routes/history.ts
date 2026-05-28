import { Router } from "express";
import db from "../db";
import { getUserId } from "../utils";

const router = Router();

router.get("/:conversationId", (req, res) => {
  const userId = getUserId(req);
  const history = db.prepare("SELECT * FROM conversation_history WHERE user_id = ? AND conversation_id = ? ORDER BY timestamp ASC")
    .all(userId, req.params.conversationId);
  res.json(history);
});

router.post("/", (req, res) => {
  const userId = getUserId(req);
  const { conversation_id, role, content } = req.body;
  db.prepare("INSERT INTO conversation_history (user_id, conversation_id, role, content) VALUES (?, ?, ?, ?)")
    .run(userId, conversation_id, role, content);
  res.json({ status: "saved" });
});

export default router;
