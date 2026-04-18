import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ chargeId: string }> },
) {
  const { chargeId } = await context.params;
  const url = new URL(request.url);

  return proxyJsonRequest({
    request,
    path: `/charges/${chargeId}/events${url.search}`,
    method: "GET",
  });
}
