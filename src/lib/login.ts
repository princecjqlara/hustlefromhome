export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
export function loginFailure(error: {
  status?: number;
  code?: string;
  name?: string;
}) {
  if (error.status === 429 || error.code === "over_request_rate_limit")
    return {
      status: 429,
      message: "Too many sign-in attempts. Please wait before trying again.",
    };
  if ((error.status || 0) >= 500 || error.name === "AuthRetryableFetchError")
    return {
      status: 503,
      message:
        "The sign-in service is temporarily unavailable. Please try again.",
    };
  if (error.code === "email_not_confirmed")
    return { status: 403, message: "Confirm your email before signing in." };
  if (
    error.code === "invalid_credentials" ||
    error.status === 400 ||
    error.status === 401
  )
    return { status: 401, message: "Invalid email or password" };
  return {
    status: 503,
    message: "Unable to sign in right now. Please try again.",
  };
}
export function allowedOrigin(
  origin: string | null,
  requestUrl: string,
  host: string | null,
  configuredOrigin?: string,
) {
  if (!origin) return true;
  const request = new URL(requestUrl);
  if (origin === request.origin || origin === configuredOrigin) return true;
  try {
    const candidate = new URL(origin);
    return (
      candidate.origin === origin &&
      candidate.host.toLowerCase() === host?.toLowerCase() &&
      candidate.protocol === request.protocol
    );
  } catch {
    return false;
  }
}
