import type { Request, Response, NextFunction } from "express";
import { AppError, BadRequestError } from "../shared/errors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  const error = isJsonParseError(err)
    ? new BadRequestError("Malformed JSON body")
    : err;

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });

    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Internal server error",
    },
  });
}

function isJsonParseError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    "type" in err &&
    err.type === "entity.parse.failed"
  );
}
