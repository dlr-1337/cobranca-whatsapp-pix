import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ chargeId: string }> },
) {
  const { chargeId } = await context.params;
  const url = new URL(request.url);
  const query = url.searchParams.toString();

  return proxyJsonRequest({
    request,
    path: `/messaging/charges/${chargeId}/preview${query ? `?${query}` : ""}`,
    method: "GET",
  });
}
