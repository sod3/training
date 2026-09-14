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
  let fieldErrors: Record<string, string> | undefined = undefined;

  if (error instanceof AppError) {
    status = error.status;
    if (status < 500) message = error.message;
  } else if (error instanceof ZodError) {
    status = 400;
    const errorsMap: Record<string, string> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".");
      if (path && !errorsMap[path]) {
        errorsMap[path] = issue.message;
      }
    }
    if (Object.keys(errorsMap).length > 0) {
      fieldErrors = errorsMap;
      const firstKey = Object.keys(errorsMap)[0];
      const firstMsg = errorsMap[firstKey];
      message =
        Object.keys(errorsMap).length === 1
          ? firstMsg
          : `Please fix the highlighted fields: ${Object.values(errorsMap).join("; ")}`;
    } else {
      message = "Validation failed. Check your input and try again.";
    }
  } else if (error instanceof mongoose.Error.ValidationError) {
    status = 400;
    const errorsMap: Record<string, string> = {};
    for (const [key, err] of Object.entries(error.errors)) {
      errorsMap[key] = err.message;
    }
    fieldErrors = errorsMap;
    const msgs = Object.values(errorsMap);
    message = msgs.length > 0 ? msgs.join("; ") : "Invalid data. Check field values.";
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400;
    const path = error.path || "field";
    message = `Invalid format for ${path}.`;
    fieldErrors = { [path]: `Invalid ${path} format` };
  } else if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === 11000
  ) {
    status = 409;
    const keyPattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern || {};
    if ("normalizedEmail" in keyPattern || "email" in keyPattern) {
      message = "An account with this email address already exists.";
      fieldErrors = { email: "This email address is already registered." };
    } else if ("transactionId" in keyPattern) {
      message = "That transaction ID has already been submitted.";
      fieldErrors = { transactionId: "This transaction ID was already used." };
    } else if ("slug" in keyPattern) {
      message = "This title or unique slug already exists.";
      fieldErrors = { slug: "This slug is already taken." };
    } else {
      message = "This record conflicts with an existing entry.";
    }
  } else if (error instanceof mongoose.Error.VersionError) {
    status = 409;
    message = "This record changed in another session. Refresh and try again.";
  } else if (error instanceof mongoose.Error.DocumentNotFoundError) {
    status = 404;
    message = "The requested record was not found.";
  }

  const expectedFailure =
    (status < 500 &&
      (error instanceof AppError || error instanceof ZodError)) ||
    (status === 503 && error instanceof AppError);
  if (!expectedFailure)
    logRequestError(error, { ...context, requestId }, status);

  return Response.json(
    { error: message, fieldErrors, requestId },
    {
      status,
      headers: { "Cache-Control": "no-store", "X-Request-Id": requestId },
    },
  );
}
