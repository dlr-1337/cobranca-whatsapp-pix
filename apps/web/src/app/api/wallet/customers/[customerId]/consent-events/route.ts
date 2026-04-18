import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await context.params;
  const url = new URL(request.url);

  return proxyJsonRequest({
    request,
    path: `/wallet/customers/${customerId}/consent-events${url.search}`,
    method: "GET",
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await context.params;

  return proxyJsonRequest({
    request,
    path: `/wallet/customers/${customerId}/consent-events`,
    method: "POST",
  });
}
