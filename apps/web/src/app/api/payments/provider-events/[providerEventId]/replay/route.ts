import { proxyJsonRequest } from "@/lib/backend-proxy";

export async function POST(
  request: Request,
  context: { params: Promise<{ providerEventId: string }> },
) {
  const { providerEventId } = await context.params;

  return proxyJsonRequest({
    request,
    path: `/payments/provider-events/${providerEventId}/replay`,
    method: "POST",
  });
}
