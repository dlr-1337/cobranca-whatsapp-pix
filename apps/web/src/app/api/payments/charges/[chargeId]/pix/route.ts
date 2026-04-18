import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ chargeId: string }> },
) {
  const { chargeId } = await context.params;

  return proxyJsonRequest({
    request,
    path: `/payments/charges/${chargeId}/pix`,
    method: "POST",
  });
}
