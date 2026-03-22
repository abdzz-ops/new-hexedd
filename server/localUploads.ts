import type { Express } from "express";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { pool } from "./db";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getMetaPath(uuid: string) {
  return path.join(UPLOADS_DIR, `${uuid}.meta.json`);
}

function saveMeta(uuid: string, data: { name: string; contentType: string }) {
  try {
    fs.writeFileSync(getMetaPath(uuid), JSON.stringify(data));
  } catch (_) {}
}

function loadMeta(uuid: string): { name: string; contentType: string } | null {
  try {
    const raw = fs.readFileSync(getMetaPath(uuid), "utf-8");
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function getBaseUrl(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string || (req.secure ? "https" : "http")).split(",")[0].trim();
  const host = (req.headers["x-forwarded-host"] as string || req.headers.host || "localhost").split(",")[0].trim();
  return `${proto}://${host}`;
}

export function registerUploadRoutes(app: Express): void {
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
      const { name, contentType } = req.body;
      const uuid = randomUUID();
      saveMeta(uuid, { name: name || "file", contentType: contentType || "application/octet-stream" });

      const base = getBaseUrl(req);
      const uploadURL = `${base}/api/uploads/file/${uuid}`;
      const objectPath = `/objects/uploads/${uuid}`;
      const publicUrl = `${base}${objectPath}`;

      const user = req.user as any;
      pool.query(
        `INSERT INTO uploads (user_id, username, file_name, content_type, object_path, public_url) VALUES ($1,$2,$3,$4,$5,$6)`,
        [user?.id || null, user?.username || null, name || "file", contentType || "application/octet-stream", objectPath, publicUrl]
      ).catch(() => {});

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
    const meta = loadMeta(uuid);
    if (meta?.contentType) res.setHeader("Content-Type", meta.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.sendFile(filePath);
  });
}
