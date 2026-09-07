import { ZodError } from "zod";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { logRequestError } from "./diagnostics";
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}
export function assert(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new AppError(message, status);
}
export function errorResponse(
  error: unknown,
  context: { method?: string; route?: string; operation?: string } = {},
) {
  const requestId = randomUUID();
  let status = 500;
  let message = "Unable to complete the request. Please try again.";
  if (error instanceof AppError) {
    status = error.status;
    if (status < 500) message = error.message;
  } else if (error instanceof ZodError) {
    status = 400;
    message = error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
  } else if (
    error instanceof mongoose.Error.ValidationError ||
    error instanceof mongoose.Error.CastError ||
    error instanceof mongoose.Error.StrictModeError
  ) {
    status = 400;
    message = "Invalid data. Check the identifiers and field values.";
  } else if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    status = 409;
    message =
      "This action conflicts with an existing record. Refresh and try again.";
  } else if (error instanceof mongoose.Error.VersionError) {
    status = 409;
    message = "This record changed. Reload and try again.";
  } else if (error instanceof mongoose.Error.DocumentNotFoundError) {
    status = 404;
    message = "Record not found. Reload and try again.";
  }
  // Expected validation, authorization, not-found and state-conflict responses
  // are not server incidents. Keep unexpected driver/schema failures logged even
  // when they map to a safe 4xx response so production diagnostics stay useful.
  const expectedFailure =
    (status < 500 &&
      (error instanceof AppError || error instanceof ZodError)) ||
    (status === 503 && error instanceof AppError);
  if (!expectedFailure)
    logRequestError(error, { ...context, requestId }, status);
  return Response.json(
    { error: message, requestId },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    },
  );
}
