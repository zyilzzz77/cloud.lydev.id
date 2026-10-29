export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...init, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => null)) as
    | ({ data?: T } & ErrorPayload)
    | null;

  if (!response.ok) {
    throw new ApiError(
      payload?.error?.code ?? "INTERNAL_ERROR",
      payload?.error?.message ?? "The request could not be completed.",
      response.status,
      payload?.error?.details,
    );
  }

  return (payload?.data ?? payload) as T;
}
