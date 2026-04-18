import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function POST(request: Request) {
  return proxyJsonRequest({
    request,
    path: "/auth/confirm-email",
    method: "POST",
    includeSessionCookie: false,
  });
}
