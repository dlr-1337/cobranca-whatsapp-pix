import { Suspense } from "react";

import { ResetPasswordFlow } from "@/components/auth/reset-password-flow";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordFlow />
    </Suspense>
  );
}
