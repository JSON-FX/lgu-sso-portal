import { NextRequest, NextResponse } from "next/server";

const SECURE = process.env.NODE_ENV === "production";
const COOKIE_NAME = SECURE ? "__Host-portal_session" : "portal_session";
const API_URL = process.env.SSO_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
const PORTAL_ORIGIN = process.env.SSO_PORTAL_ORIGIN;
const LEGACY_DOMAIN = process.env.SSO_LEGACY_COOKIE_DOMAIN;
const AUTH_PATHS = new Set(["login", "logout", "logout-all", "refresh", "me", "change-password"]);
const PORTAL_PATHS = new Set(["employees", "applications", "audit", "stats", "offices", "positions", "locations", "portal"]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

function clearLegacyCookies(result: NextResponse) {
  const names = ["lgu_sso_token", ...(SECURE ? ["portal_session"] : [])];
  for (const name of names) {
    result.cookies.set(name, "", { path: "/", maxAge: 0, httpOnly: true, secure: SECURE, sameSite: "lax" });
  }
  for (const name of names) {
    if (LEGACY_DOMAIN) {
      result.headers.append("Set-Cookie", `${name}=; Path=/; Domain=${LEGACY_DOMAIN}; Max-Age=0; HttpOnly; SameSite=Lax${SECURE ? "; Secure" : ""}`);
    }
  }
}

async function boundedBody(body: ReadableStream<Uint8Array> | null, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (!body) return new Uint8Array();
  const reader = body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RangeError("Request too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const method = request.method;
  const origin = request.headers.get("origin");
  const publicOrigin = PORTAL_ORIGIN || request.nextUrl.origin;
  if (!["GET", "HEAD"].includes(method) && origin !== publicOrigin) {
    return jsonError("Invalid request origin.", 403);
  }

  const { path } = await context.params;
  const allowed = PORTAL_PATHS.has(path[0])
    || path[0] === "auth" && path.length === 2 && AUTH_PATHS.has(path[1])
    || path[0] === "sso" && path.length === 2 && ["code", "validate-redirect"].includes(path[1]);
  if (!allowed || path.some((part) => part === "." || part === ".." || /[/\\]/.test(part))) {
    return jsonError("Endpoint not available through the portal.", 404);
  }

  const target = new URL(`${API_URL.replace(/\/$/, "")}/${path.map(encodeURIComponent).join("/")}`);
  target.search = request.nextUrl.search;
  const headers = new Headers({ Accept: "application/json" });
  if (request.headers.has("content-type")) headers.set("Content-Type", request.headers.get("content-type")!);
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Only deployments behind the configured trusted ingress forward client IPs.
  if (process.env.SSO_TRUST_PROXY_HEADERS === "true") {
    const clientIp = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
    if (clientIp) headers.set("X-Forwarded-For", clientIp);
  }

  let body: Uint8Array<ArrayBuffer> | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    try { body = await boundedBody(request.body, 6 * 1024 * 1024); }
    catch { return jsonError("The upload is too large. Choose a photo up to 5 MB.", 413); }
  }
  let upstream: Response;
  let responseBody: string;
  try {
    upstream = await fetch(target, {
      method, headers,
      body,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (upstream.ok && upstream.headers.get("content-type")?.split(";")[0] === "image/webp") {
      const bytes = await boundedBody(upstream.body, 512 * 1024);
      return new NextResponse(bytes, { status: 200, headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
    }
    responseBody = await upstream.text();
  } catch {
    return jsonError("Sign-in service is temporarily unavailable. Please try again.", 503);
  }

  let payload: Record<string, unknown> | null = null;
  try { payload = JSON.parse(responseBody); } catch { /* Preserve non-JSON upstream errors. */ }
  const isTokenResponse = method === "POST" && path[0] === "auth" && ["login", "refresh"].includes(path[1]);
  const isLogout = method === "POST" && path[0] === "auth" && ["logout", "logout-all"].includes(path[1]);
  if (isTokenResponse && upstream.ok) {
    if (!payload || typeof payload.access_token !== "string") return jsonError("Invalid sign-in service response.", 502);
    const accessToken = payload.access_token;
    delete payload.access_token;
    const result = NextResponse.json(payload, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    result.cookies.set(COOKIE_NAME, accessToken, {
      httpOnly: true, secure: SECURE, sameSite: "lax", path: "/",
      maxAge: typeof payload.expires_in === "number" && payload.expires_in > 0 ? Math.min(payload.expires_in, 86400) : 86400,
    });
    clearLegacyCookies(result);
    return result;
  }

  const result = new NextResponse(upstream.status === 204 ? null : responseBody, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "no-store" },
  });
  const retryAfter = upstream.headers.get("retry-after");
  if (retryAfter) result.headers.set("Retry-After", retryAfter);
  if (upstream.status === 401 && token || isLogout && upstream.ok) {
    result.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, httpOnly: true, secure: SECURE, sameSite: "lax" });
    clearLegacyCookies(result);
  }
  return result;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
