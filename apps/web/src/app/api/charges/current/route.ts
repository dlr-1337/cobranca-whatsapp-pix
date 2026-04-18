import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);

  return proxyJsonRequest({
    request,
    path: `/charges/current${url.search}`,
    method: "GET",
  });
}
