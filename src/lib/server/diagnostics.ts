// Keep operation context on the original error so transaction retries still see
// MongoDB's error labels. Log only the final failure at the HTTP boundary.
const operations = new WeakMap<object, string>();

export async function databaseOperation<T>(
  operation: string,
  run: () => PromiseLike<T>,
): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (error && typeof error === "object" && !operations.has(error))
      operations.set(error, operation);
    throw error;
  }
}

export function redact(value: string) {
  let result = value;
  for (const [key, secret] of Object.entries(process.env)) {
    if (
      secret &&
      /SECRET|PASSWORD|TOKEN|API_KEY|ACCESS_KEY|MONGODB_URI/i.test(key)
    )
      result = result.split(secret).join("[REDACTED]");
  }
  return result
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[REDACTED_MONGODB_URI]")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]");
}

function details(error: unknown, depth = 0): Record<string, unknown> {
  if (!(error instanceof Error)) return { name: "UnknownError" };
  const extra = error as Error & {
    code?: unknown;
    codeName?: unknown;
    errorLabels?: unknown;
    errors?: Record<string, unknown>;
  };
  return {
    name: error.name,
    message: redact(error.message),
    stack: error.stack ? redact(error.stack) : undefined,
    code: typeof extra.code === "number" ? extra.code : undefined,
    codeName:
      typeof extra.codeName === "string" ? redact(extra.codeName) : undefined,
    errorLabels: Array.isArray(extra.errorLabels)
      ? extra.errorLabels
          .filter((label): label is string => typeof label === "string")
          .map(redact)
      : undefined,
    ...(depth < 2 && error.cause
      ? { cause: details(error.cause, depth + 1) }
      : {}),
    ...(depth < 2 && extra.errors
      ? {
          validationErrors: Object.values(extra.errors).map((entry) =>
            details(entry, depth + 1),
          ),
        }
      : {}),
  };
}

export function logRequestError(
  error: unknown,
  context: {
    requestId: string;
    method?: string;
    route?: string;
    operation?: string;
  },
  status: number,
) {
  console.error(
    "Spotter request failed",
    JSON.stringify({
      ...context,
      route: context.route ? redact(context.route) : undefined,
      operation:
        error && typeof error === "object"
          ? (operations.get(error) ?? context.operation ?? "request")
          : (context.operation ?? "request"),
      status,
      error: details(error),
    }),
  );
}
