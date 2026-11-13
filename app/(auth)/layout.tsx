import { AuthBrand, AuthLogo } from "@/components/auth/AuthShell";

/** Log in, sign up and password pages: a framed card in the middle of the screen, the form on the left and the navy panel on the right, no site header. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-frame">
        <main className="auth-main" id="main">
          <AuthLogo />
          {children}
        </main>
        <AuthBrand />
      </div>
    </div>
  );
}
