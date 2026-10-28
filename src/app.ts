import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { notFound } from "./middlewares/not-found";
import { errorHandler } from "./middlewares/error-handler";

export interface AppOptions {
  corsOrigins?: string[];
}

export function createApp({ corsOrigins = [] }: AppOptions = {}): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: corsOrigins }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    return res.status(200).json({ status: "ok" });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
