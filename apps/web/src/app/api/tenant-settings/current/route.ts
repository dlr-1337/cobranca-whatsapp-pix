import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(request: Request) {
  return proxyJsonRequest({
    request,
    path: "/tenant-settings/current",
    method: "GET",
  });
}

export async function PATCH(request: Request) {
  return proxyJsonRequest({
    request,
    path: "/tenant-settings/current",
    method: "PATCH",
  });
}
