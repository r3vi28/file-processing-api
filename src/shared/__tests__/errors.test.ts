import { AppError, BadRequestError, NotFoundError } from "../errors";

describe("AppError", () => {
  it("is an Error that carries a status code, a stable code and a message", () => {
    const error = new AppError(500, "INTERNAL_ERROR", "Something went wrong");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe("INTERNAL_ERROR");
    expect(error.message).toBe("Something went wrong");
  });

  it("leaves details undefined when they are not given", () => {
    const error = new AppError(500, "INTERNAL_ERROR", "Something went wrong");

    expect(error.details).toBeUndefined();
  });

  it("keeps the details it receives", () => {
    const details = { field: "preset", reason: "unknown" };
    const error = new AppError(400, "BAD_REQUEST", "Invalid preset", details);

    expect(error.details).toEqual(details);
  });

  it("uses the class name as its name and keeps a stack trace", () => {
    const error = new AppError(500, "INTERNAL_ERROR", "Boom");

    expect(error.name).toBe("AppError");
    expect(error.stack).toContain("Boom");
  });
});

describe("NotFoundError", () => {
  it("is an AppError with status 404 and code NOT_FOUND", () => {
    const error = new NotFoundError();

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("NOT_FOUND");
    expect(error.name).toBe("NotFoundError");
  });

  it("has a default message that can be replaced", () => {
    expect(new NotFoundError().message).toBe("Resource not found");
    expect(new NotFoundError("Job not found").message).toBe("Job not found");
  });
});

describe("BadRequestError", () => {
  it("is an AppError with status 400 and code BAD_REQUEST", () => {
    const error = new BadRequestError("Malformed JSON body");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(BadRequestError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("BAD_REQUEST");
    expect(error.message).toBe("Malformed JSON body");
    expect(error.name).toBe("BadRequestError");
  });

  it("passes its details through", () => {
    const error = new BadRequestError("Invalid body", { line: 1 });

    expect(error.details).toEqual({ line: 1 });
  });
});
