import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  const url = new URL(request.url);

  return proxyJsonRequest({
    request,
    path: `/charges${url.search}`,
    method: "GET",
  });
}

export async function POST(request: Request) {
  return proxyJsonRequest({
    request,
    path: "/charges",
    method: "POST",
  });
}
