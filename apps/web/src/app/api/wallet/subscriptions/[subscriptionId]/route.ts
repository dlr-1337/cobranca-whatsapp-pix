import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ subscriptionId: string }> },
) {
  const { subscriptionId } = await context.params;

  return proxyJsonRequest({
    request,
    path: `/wallet/subscriptions/${subscriptionId}`,
    method: "PATCH",
  });
}
