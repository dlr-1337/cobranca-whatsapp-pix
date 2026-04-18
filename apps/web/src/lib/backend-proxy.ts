import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? "czp_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;

function backendBaseUrl() {
  const explicitBaseUrl = process.env.API_BASE_URL;

  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/$/, "");
  }

  return `http://127.0.0.1:${process.env.API_PORT ?? "3001"}`;
}

async function sessionCookieHeader() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`;
}

async function readRequestBody(request: Request) {
  const rawBody = await request.text();

  if (!rawBody) {
    return undefined;
  }

  return JSON.parse(rawBody) as unknown;
}

async function readUpstreamPayload(response: Response) {
  if (response.status === 204) {
    return null;
  }

  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return {
      message: rawBody,
    };
  }
}

function sessionValueFromSetCookie(setCookieHeader: string | null) {
  if (!setCookieHeader) {
    return null;
  }

  const match = setCookieHeader.match(
    new RegExp(`${SESSION_COOKIE_NAME}=([^;]*)`, "i"),
  );

  if (!match?.[1]) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

function syncSessionCookie(response: NextResponse, upstream: Response) {
  const setCookieHeader = upstream.headers.get("set-cookie");

  if (!setCookieHeader) {
    return;
  }

  const sessionValue = sessionValueFromSetCookie(setCookieHeader);
  const shouldClearCookie =
    sessionValue === null ||
    sessionValue === "" ||
    /expires=thu, 01 jan 1970/i.test(setCookieHeader) ||
    /max-age=0/i.test(setCookieHeader);

  if (shouldClearCookie) {
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
    return;
  }

  response.cookies.set(SESSION_COOKIE_NAME, sessionValue, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

export async function proxyJsonRequest(options: {
  request: Request;
  path: string;
  method: "GET" | "POST" | "PATCH";
  includeSessionCookie?: boolean;
  syncSessionCookie?: boolean;
}) {
  const includeSessionCookie = options.includeSessionCookie ?? true;
  const headers = new Headers({
    accept: "application/json",
  });

  const cookieHeader = includeSessionCookie ? await sessionCookieHeader() : null;

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  const requestBody =
    options.method === "GET" ? undefined : await readRequestBody(options.request);

  if (requestBody !== undefined) {
    headers.set("content-type", "application/json");
  }

  const upstream = await fetch(`${backendBaseUrl()}${options.path}`, {
    method: options.method,
    headers,
    body:
      requestBody === undefined ? undefined : JSON.stringify(requestBody),
    cache: "no-store",
  });

  const payload = await readUpstreamPayload(upstream);
  const response =
    payload === null
      ? new NextResponse(null, { status: upstream.status })
      : NextResponse.json(payload, { status: upstream.status });

  if (options.syncSessionCookie) {
    syncSessionCookie(response, upstream);
  }

  return response;
}
