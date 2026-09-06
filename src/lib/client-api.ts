"use client";
import { useEffect, useState, useCallback } from "react";
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
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Something went wrong. Please try again.");
  return result as T;
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
        if (active) setState({ data: null, error: e.message, loading: false });
      });
    return () => {
      active = false;
    };
  }, [path, version]);
  return { ...state, reload };
}
