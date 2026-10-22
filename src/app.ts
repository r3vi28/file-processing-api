import express, { type Express } from "express";
import { notFound } from "./middlewares/not-found";
import { errorHandler } from "./middlewares/error-handler";

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    return res.status(200).json({ status: "ok" });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
