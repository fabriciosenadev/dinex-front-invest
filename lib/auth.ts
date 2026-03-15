import { AuthenticateUserPayload, ErrorResponse, StoredSession } from "./types";

export const sessionStorageKey = "dinex_session";

export function readStoredSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(sessionStorageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export function persistSession(nextSession: StoredSession) {
  localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
}

export function clearStoredSession() {
  localStorage.removeItem(sessionStorageKey);
}

export async function getErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ErrorResponse;
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors.join(", ");
    }
  } catch {
    // Ignora erro de parse para manter fallback.
  }

  return fallback;
}

export async function authenticate(email: string, password: string): Promise<StoredSession> {
  const response = await fetch("/api/users/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Falha na autenticacao."));
  }

  const payload = (await response.json()) as AuthenticateUserPayload;
  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    accessTokenExpiresAtUtc: payload.expiresAtUtc,
    refreshTokenExpiresAtUtc: payload.refreshTokenExpiresAtUtc
  };
}

export async function completeInvitation(
  email: string,
  activationCode: string,
  password: string,
  confirmPassword: string
): Promise<void> {
  const response = await fetch("/api/users/complete-invitation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      activationCode,
      password,
      confirmPassword
    })
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Falha ao concluir primeiro acesso."));
  }
}

export async function resendActivationCode(email: string): Promise<void> {
  const response = await fetch("/api/users/resend-activation-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, "Falha ao reenviar codigo de ativacao."));
  }
}

export async function refreshSession(currentSession: StoredSession): Promise<StoredSession | null> {
  const response = await fetch("/api/users/refresh-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: currentSession.refreshToken })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as AuthenticateUserPayload;
  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
    accessTokenExpiresAtUtc: payload.expiresAtUtc,
    refreshTokenExpiresAtUtc: payload.refreshTokenExpiresAtUtc
  };
}

export async function authorizedFetch(
  session: StoredSession,
  path: string,
  init: RequestInit = {}
): Promise<{ response: Response; nextSession: StoredSession | null }> {
  const firstHeaders = new Headers(init.headers);
  firstHeaders.set("Authorization", `Bearer ${session.accessToken}`);

  const firstTry = await fetch(path, {
    ...init,
    headers: firstHeaders,
    cache: "no-store"
  });

  if (firstTry.status !== 401) {
    return { response: firstTry, nextSession: null };
  }

  const refreshed = await refreshSession(session);
  if (!refreshed) {
    return { response: firstTry, nextSession: null };
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("Authorization", `Bearer ${refreshed.accessToken}`);

  const retryResponse = await fetch(path, {
    ...init,
    headers: retryHeaders,
    cache: "no-store"
  });

  return { response: retryResponse, nextSession: refreshed };
}
