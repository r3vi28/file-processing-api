import type { Request, Response, NextFunction } from "express";
import { AppError, BadRequestError } from "../shared/errors";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Response already started: let Express close the connection
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

/** express.json() marks body parse failures with type "entity.parse.failed". */
function isJsonParseError(err: unknown): boolean {
  return (
    err instanceof SyntaxError &&
    "type" in err &&
    err.type === "entity.parse.failed"
  );
}
