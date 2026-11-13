import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { ResetForm } from "@/components/auth/AuthForms";
import { authConfigured, currentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * The reset link from the email signs the person in (through /auth/callback) and lands here.
 * Without that session there's nothing to change, so the page asks for a new link.
 */
export default async function ResetPasswordPage() {
  const user = authConfigured() ? await currentUser().catch(() => null) : null;
  return (
    <div className="auth-panel">
      {user ? (
        <ResetForm email={user.email} />
      ) : (
        <div className="auth-card">
          <span className="auth-icon" aria-hidden="true"><Clock size={22} /></span>
          <div className="auth-head">
            <h1 className="auth-title">This link has expired</h1>
            <p className="auth-sub">Reset links work once and expire after an hour. Ask for a new one and use the newest email.</p>
          </div>
          <a href="/forgot-password" className="btn btn-primary btn-block auth-submit">Send a new reset link</a>
          <p className="auth-fine auth-center"><a href="/login">Back to log in</a></p>
        </div>
      )}
    </div>
  );
}
