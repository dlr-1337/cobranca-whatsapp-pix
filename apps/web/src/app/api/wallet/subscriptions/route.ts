import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);

  return proxyJsonRequest({
    request,
    path: `/wallet/subscriptions${url.search}`,
    method: "GET",
  });
}

export async function POST(request: Request) {
  return proxyJsonRequest({
    request,
    path: "/wallet/subscriptions",
    method: "POST",
  });
}
