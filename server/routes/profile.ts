import { Router } from "express";
import db from "../db";
import { getUserId } from "../utils";

const router = Router();

router.get("/", (req, res) => {
  const userId = getUserId(req);
  let profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId) as any;
  if (!profile) {
    db.prepare("INSERT OR IGNORE INTO user_profiles (user_id) VALUES (?)").run(userId);
    profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId) as any;
  }
  res.json(profile);
});

router.post("/", (req, res) => {
  const userId = getUserId(req);
  const { budget_limit, lifestyle_info, emergency_target, emergency_saved } = req.body;
  
  // ensure user_profile exists first
  const profile = db.prepare("SELECT * FROM user_profiles WHERE user_id = ?").get(userId) as any;
  if (!profile) {
    db.prepare("INSERT INTO user_profiles (user_id, budget_limit, lifestyle_info, emergency_target, emergency_saved) VALUES (?, ?, ?, ?, ?)")
      .run(
        userId, 
        budget_limit !== undefined ? budget_limit : 10000, 
        lifestyle_info !== undefined ? lifestyle_info : "",
        emergency_target !== undefined ? emergency_target : 5000,
        emergency_saved !== undefined ? emergency_saved : 0
      );
  } else {
    const final_budget = budget_limit !== undefined ? budget_limit : profile.budget_limit;
    const final_lifestyle = lifestyle_info !== undefined ? lifestyle_info : profile.lifestyle_info;
    const final_target = emergency_target !== undefined ? emergency_target : (profile.emergency_target !== null && profile.emergency_target !== undefined ? profile.emergency_target : 5000);
    const final_saved = emergency_saved !== undefined ? emergency_saved : (profile.emergency_saved !== null && profile.emergency_saved !== undefined ? profile.emergency_saved : 0);

    db.prepare("UPDATE user_profiles SET budget_limit = ?, lifestyle_info = ?, emergency_target = ?, emergency_saved = ? WHERE user_id = ?")
      .run(final_budget, final_lifestyle, final_target, final_saved, userId);
  }
  res.json({ status: "updated" });
});

export default router;
