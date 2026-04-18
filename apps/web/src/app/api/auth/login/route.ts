import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  return proxyJsonRequest({
    request,
    path: "/auth/login",
    method: "POST",
    includeSessionCookie: false,
    syncSessionCookie: true,
  });
}
