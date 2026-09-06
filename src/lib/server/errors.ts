import { ZodError } from "zod";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function assert(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new AppError(message, status);
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 422 },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  )
    return Response.json(
      {
        error:
          "This action conflicts with an existing record. Refresh and try again.",
      },
      { status: 409 },
    );
  // Never log request bodies, database errors (which may contain credentials), or tokens.
  console.error(
    "Spotter request failed",
    error instanceof Error ? error.name : "UnknownError",
  );
  return Response.json(
    { error: "The service is temporarily unavailable. Please try again." },
    { status: 503 },
  );
}
