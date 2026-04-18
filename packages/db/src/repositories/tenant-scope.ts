import { and, eq, ilike, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export function requireTenantId(tenantId: string) {
  const normalized = tenantId.trim();

  if (!normalized) {
    throw new Error("tenant_id is required");
  }

  return normalized;
}

export function tenantScopedWhere(
  tenantColumn: AnyPgColumn,
  tenantId: string,
  ...clauses: Array<SQL | undefined>
) {
  return and(eq(tenantColumn, requireTenantId(tenantId)), ...clauses);
}

export function ilikeIfPresent(column: AnyPgColumn, value?: string) {
  if (!value?.trim()) {
    return undefined;
  }

  return ilike(column, `%${value.trim()}%`);
}
