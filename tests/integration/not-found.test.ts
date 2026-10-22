import request from "supertest";
import { createApp } from "../../src/app";

describe("unknown routes", () => {
  it("respond 404 with the single error format", async () => {
    const response = await request(createApp()).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route GET /does-not-exist not found",
      },
    });
  });

  it("respond 404 when the path exists but the method does not", async () => {
    const response = await request(createApp()).post("/health");

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Route POST /health not found");
  });

  it("do not echo the query string back in the message", async () => {
    const response = await request(createApp()).get(
      "/does-not-exist?token=secret",
    );

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe(
      "Route GET /does-not-exist not found",
    );
  });
});
