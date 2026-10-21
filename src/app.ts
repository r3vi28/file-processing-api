import express, { type Express } from "express";

export function createApp(): Express {
  const app = express();

  app.get("/health", (_req, res) => {
    return res.status(200).json({ status: "ok" });
  });

  return app;
}
