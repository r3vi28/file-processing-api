import express from "express";
import request from "supertest";
import { BadRequestError, NotFoundError } from "../../shared/errors";
import { errorHandler } from "../error-handler";

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

  app.use(errorHandler);

  return app;
}

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
});
