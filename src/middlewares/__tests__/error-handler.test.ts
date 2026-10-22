import express from "express";
import request from "supertest";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { errorHandler } from "../error-handler";

const internalError = new Error("connection to db://admin:hunter2 failed");

// A minimal app with routes that fail on purpose, so the handler can be
// tested on its own, without depending on the real routes.
function createTestApp() {
  const app = express();

  app.get("/not-found", () => {
    throw new NotFoundError("Job not found");
  });

  app.get("/bad-request", () => {
    throw new BadRequestError("Invalid preset", {
      allowed: ["users", "sales"],
    });
  });

  app.get("/async", async () => {
    throw new NotFoundError("Job not found");
  });

  app.get("/crash", () => {
    throw internalError;
  });

  app.get("/throws-a-string", () => {
    throw "something that is not an Error";
  });

  app.use(errorHandler);

  return app;
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  // Silence and record console.error: unknown errors are logged.
  consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("errorHandler with an AppError", () => {
  it("responds with the error's status code, code and message", async () => {
    const response = await request(createTestApp()).get("/not-found");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Job not found" },
    });
  });

  it("includes details when the error has them", async () => {
    const response = await request(createTestApp()).get("/bad-request");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "BAD_REQUEST",
        message: "Invalid preset",
        details: { allowed: ["users", "sales"] },
      },
    });
  });

  it("omits the details key when the error has none", async () => {
    const response = await request(createTestApp()).get("/not-found");

    expect(response.body.error).not.toHaveProperty("details");
  });

  it("also handles errors thrown inside async route handlers", async () => {
    const response = await request(createTestApp()).get("/async");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("does not log expected client errors", async () => {
    await request(createTestApp()).get("/not-found");

    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe("errorHandler with an unknown error", () => {
  it("responds 500 with a generic INTERNAL_ERROR", async () => {
    const response = await request(createTestApp()).get("/crash");

    expect(response.status).toBe(500);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  });

  it("does not leak the original message to the client", async () => {
    const response = await request(createTestApp()).get("/crash");

    expect(response.text).not.toContain("hunter2");
  });

  it("logs the original error on the server", async () => {
    await request(createTestApp()).get("/crash");

    expect(consoleError.mock.calls.flat()).toContain(internalError);
  });

  it("also handles thrown values that are not Error instances", async () => {
    const response = await request(createTestApp()).get("/throws-a-string");

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
  });
});
