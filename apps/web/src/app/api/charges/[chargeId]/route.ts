import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ chargeId: string }> },
) {
  const { chargeId } = await context.params;

  return proxyJsonRequest({
    request,
    path: `/charges/${chargeId}`,
    method: "PATCH",
  });
}
