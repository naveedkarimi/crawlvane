import type { Metadata } from "next";
import { ForgotForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="auth-panel"><ForgotForm /></div>
  );
}
