import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ subscriptionId: string }> },
) {
  const { subscriptionId } = await context.params;
  const url = new URL(request.url);

  return proxyJsonRequest({
    request,
    path: `/wallet/subscriptions/${subscriptionId}/events${url.search}`,
    method: "GET",
  });
}
