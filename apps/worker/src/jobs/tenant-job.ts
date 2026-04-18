export interface TenantJobPayload {
  tenantId: string;
  correlationId: string;
}

export function assertTenantJobPayload(
  payload: Partial<TenantJobPayload>,
): asserts payload is TenantJobPayload {
  if (!payload.tenantId?.trim()) {
    throw new Error('tenant_id is required in worker payloads');
  }

  if (!payload.correlationId?.trim()) {
    throw new Error('correlation_id is required in worker payloads');
  }
}

export async function runTenantAwareJob<TPayload extends Partial<TenantJobPayload>, TResult>(
  payload: TPayload,
  resolveTenant: (tenantId: string) => Promise<boolean>,
  handler: (validatedPayload: TenantJobPayload & TPayload) => Promise<TResult>,
) {
  assertTenantJobPayload(payload);

  const tenantExists = await resolveTenant(payload.tenantId);

  if (!tenantExists) {
    throw new Error('worker payload tenant could not be revalidated');
  }

  return handler(payload as TenantJobPayload & TPayload);
}
