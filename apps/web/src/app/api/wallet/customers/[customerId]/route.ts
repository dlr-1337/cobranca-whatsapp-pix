import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ customerId: string }> },
) {
  const { customerId } = await context.params;

  return proxyJsonRequest({
    request,
    path: `/wallet/customers/${customerId}`,
    method: "PATCH",
  });
}
