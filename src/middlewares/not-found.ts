import type { Request, Response, NextFunction } from "express";
import { NotFoundError } from "../shared/errors";

export function notFound(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
}
