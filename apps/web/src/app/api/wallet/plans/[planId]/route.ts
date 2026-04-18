import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ planId: string }> },
) {
  const { planId } = await context.params;

  return proxyJsonRequest({
    request,
    path: `/wallet/plans/${planId}`,
    method: "PATCH",
  });
}
