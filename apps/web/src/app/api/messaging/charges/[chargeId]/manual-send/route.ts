import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ chargeId: string }> },
) {
  const { chargeId } = await context.params;

  return proxyJsonRequest({
    request,
    path: `/messaging/charges/${chargeId}/manual-send`,
    method: "POST",
  });
}
