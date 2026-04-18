import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  return proxyJsonRequest({
    request,
    path: "/auth/session",
    method: "GET",
  });
}
