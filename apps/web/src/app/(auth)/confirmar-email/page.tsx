import { Suspense } from "react";

import { ConfirmEmailStatus } from "@/components/auth/confirm-email-status";

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmEmailStatus />
    </Suspense>
  );
}
