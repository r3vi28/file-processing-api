import request from "supertest";
import { createApp } from "../../src/app";

describe("JSON request bodies", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("respond 400 in the single error format when the JSON is malformed", async () => {
    const response = await request(createApp())
      .post("/does-not-exist")
      .set("Content-Type", "application/json")
      .send('{"name": "broken"');

    expect(response.status).toBe(400);
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.body).toEqual({
      error: { code: "BAD_REQUEST", message: "Malformed JSON body" },
    });
  });

  it("do not log malformed JSON as a server error", async () => {
    await request(createApp())
      .post("/does-not-exist")
      .set("Content-Type", "application/json")
      .send('{"name": "broken"');

    expect(consoleError).not.toHaveBeenCalled();
  });

  it("are parsed normally when the JSON is valid", async () => {
    const response = await request(createApp())
      .post("/does-not-exist")
      .send({ name: "valid" });

    // The body parses fine, so the request reaches the 404 handler.
    expect(response.status).toBe(404);
  });
});
