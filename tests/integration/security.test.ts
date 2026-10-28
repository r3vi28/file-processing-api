import request from "supertest";
import { createApp } from "../../src/app";

const allowedOrigin = "http://localhost:5173";
const otherOrigin = "https://evil.example.com";

describe("helmet security headers", () => {
  it("are set on normal responses", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-security-policy"]).toBeDefined();
  });

  it("are also set on error responses", async () => {
    const response = await request(createApp()).get("/does-not-exist");

    expect(response.status).toBe(404);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("remove the X-Powered-By header", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("CORS", () => {
  const app = createApp({ corsOrigins: [allowedOrigin] });

  it("allows an origin from the list", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", allowedOrigin);

    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
  });

  it("does not allow an origin that is not in the list", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", otherOrigin);

    // The server still answers; it is the browser that blocks the response
    // because the Access-Control-Allow-Origin header is missing.
    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("allows no origin at all when no list is given", async () => {
    const response = await request(createApp())
      .get("/health")
      .set("Origin", allowedOrigin);

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers preflight requests from an allowed origin", async () => {
    const response = await request(app)
      .options("/health")
      .set("Origin", allowedOrigin)
      .set("Access-Control-Request-Method", "GET");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    expect(response.headers["access-control-allow-methods"]).toContain("GET");
  });

  it("adds its headers to error responses too", async () => {
    const response = await request(app)
      .post("/does-not-exist")
      .set("Origin", allowedOrigin)
      .set("Content-Type", "application/json")
      .send('{"name": "broken"');

    // Without this header the browser would hide the 400 from the frontend.
    expect(response.status).toBe(400);
    expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
  });
});
