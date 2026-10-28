import request from "supertest";
import { createApp } from "../../src/app";

describe("GET /health", () => {
  it("responds 200 with { status: 'ok' } as JSON", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({ status: "ok" });
  });
});
