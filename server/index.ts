import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import helmet from "helmet";

import budgetRoutes from "./routes/budget";
import profileRoutes from "./routes/profile";
import historyRoutes from "./routes/history";
import subscriptionRoutes from "./routes/subscriptions";
import authRoutes from "./routes/auth";
import extendedRoutes from "./routes/extended_api";

const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === "production";

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: false,
  }));

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  app.use("/uploads", express.static(uploadsDir));

  // /upload and /api/upload handler to match the user's specification
  const handleUpload = (req: express.Request, res: express.Response) => {
    try {
      const { filename, contentType, base64 } = req.body;
      if (!filename || !contentType || !base64) {
        return res.status(400).json({ error: "Missing filename, contentType, or base64 data" });
      }

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
      let normType = contentType.toLowerCase();
      if (normType === "image/jpg") normType = "image/jpeg";

      if (!allowedTypes.includes(normType)) {
        return res.status(400).json({ error: "Unsupported file type. Please upload a JPG, PNG, WEBP, or PDF." });
      }

      // Sanitize name
      const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueName = `${Date.now()}_${cleanName}`;
      const destPath = path.join(uploadsDir, uniqueName);

      fs.writeFileSync(destPath, Buffer.from(base64, "base64"));

      res.json({
        success: true,
        message: "File uploaded successfully to uploads/",
        url: `/uploads/${uniqueName}`,
        filename: uniqueName,
        contentType: normType
      });
    } catch (e: any) {
      console.error("Upload handler error:", e);
      res.status(500).json({ error: e.message || "Failed to upload file to backend" });
    }
  };

  app.post("/upload", handleUpload);
  app.post("/api/upload", handleUpload);

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/budget", budgetRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/history", historyRoutes);
  app.use("/api/subscriptions", subscriptionRoutes);
  app.use("/api", extendedRoutes);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Error starting server:", err);
  process.exit(1);
});
