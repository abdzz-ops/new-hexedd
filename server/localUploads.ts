import type { Express } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const metaMap = new Map<string, { name: string; contentType: string }>();

export function registerUploadRoutes(app: Express): void {
  app.post("/api/uploads/request-url", (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
      const { name, contentType } = req.body;
      const uuid = randomUUID();
      metaMap.set(uuid, { name: name || "file", contentType: contentType || "application/octet-stream" });

      const proto = req.headers["x-forwarded-proto"] || (req.secure ? "https" : "http");
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const uploadURL = `${proto}://${host}/api/uploads/file/${uuid}`;
      const objectPath = `/objects/uploads/${uuid}`;
      const publicUrl = `${proto}://${host}${objectPath}`;

      res.json({ uploadURL, objectPath, publicUrl, metadata: { name, contentType: contentType || "application/octet-stream" } });
    } catch (err) {
      console.error("Upload URL error:", err);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  app.put("/api/uploads/file/:uuid", (req, res) => {
    const { uuid } = req.params;
    const filePath = path.join(UPLOADS_DIR, uuid);
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        fs.writeFileSync(filePath, Buffer.concat(chunks));
        res.status(200).send("OK");
      } catch (err) {
        console.error("File write error:", err);
        res.status(500).json({ error: "Failed to save file" });
      }
    });
    req.on("error", () => res.status(500).json({ error: "Upload stream error" }));
  });

  app.get("/objects/uploads/:uuid", (req, res) => {
    const { uuid } = req.params;
    const filePath = path.join(UPLOADS_DIR, uuid);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found" });
    const meta = metaMap.get(uuid);
    if (meta?.contentType) res.setHeader("Content-Type", meta.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.sendFile(filePath);
  });

}
