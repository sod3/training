"use client";
import { useEffect, useState, useCallback } from "react";
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiResult<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  let result: { error?: string } & Record<string, unknown> = {};
  if (contentType.includes("application/json")) {
    try {
      result = (await response.json()) as typeof result;
    } catch {
      // A truncated upstream response should still become a useful API error.
    }
  }
  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Your session has expired. Sign in and try again."
        : response.status === 403
          ? "You do not have permission to do that."
          : response.status === 404
            ? "The requested record was not found."
            : response.status === 409
              ? "This record changed or conflicts with another action. Refresh and try again."
              : response.status === 413
                ? "The submitted file or request is too large."
                : response.status === 429
                  ? "Too many attempts. Wait a moment and try again."
                  : response.status === 503
                    ? "This service is temporarily unavailable. Please try again shortly."
                    : "Something went wrong. Please try again.";
    throw new ApiError(
      typeof result.error === "string" && result.error
        ? result.error
        : fallback,
      response.status,
      response.headers.get("x-request-id") || undefined,
    );
  }
  return result as T;
}
export async function api<T = Record<string, unknown>>(
  path: string,
  data?: unknown,
  method = "POST",
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: data === undefined ? "GET" : method,
    credentials: "same-origin",
    headers:
      data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: "no-store",
  });
  return apiResult<T>(response);
}
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    loading: boolean;
  }>({ data: null, error: "", loading: !!path });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!path) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) setState((s) => ({ ...s, loading: true, error: "" }));
    });
    api<T>(path)
      .then((data) => {
        if (active) setState({ data, error: "", loading: false });
      })
      .catch((e: Error) => {
        if (active)
          setState((state) => ({
            data: state.data,
            error: e.message,
            loading: false,
          }));
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { ...state, reload };
}
