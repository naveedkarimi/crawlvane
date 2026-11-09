// Builds dist/seo-app (upload this folder to cPanel) and dist/seo-app-cpanel.zip
import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = process.cwd();
const out = path.join(root, "dist", "seo-app");
if (!existsSync(path.join(root, ".next", "standalone", "server.js"))) {
  console.error("Run `next build` first (output: standalone).");
  process.exit(1);
}
rmSync(path.join(root, "dist"), { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(path.join(root, ".next", "standalone"), out, { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(out, ".next", "static"), { recursive: true });
cpSync(path.join(root, "public"), path.join(out, "public"), { recursive: true });
rmSync(path.join(out, "data"), { recursive: true, force: true }); // never ship local test data
rmSync(path.join(out, "dist"), { recursive: true, force: true });
rmSync(path.join(out, "scripts"), { recursive: true, force: true });
rmSync(path.join(out, ".env"), { force: true });
rmSync(path.join(out, ".env.local"), { force: true });
copyFileSync(path.join(root, "cpanel-app.js"), path.join(out, "app.js"));
copyFileSync(path.join(root, ".env.example"), path.join(out, ".env.example"));
copyFileSync(path.join(root, "docs", "app", "DEPLOY-CPANEL.md"), path.join(out, "DEPLOY-CPANEL.md"));
execSync(`cd dist && zip -qr seo-app-cpanel.zip seo-app`, { stdio: "inherit" });
console.log("✓ dist/seo-app-cpanel.zip ready — see DEPLOY-CPANEL.md");
