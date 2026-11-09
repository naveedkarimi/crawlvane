/**
 * cPanel "Setup Node.js App" startup file.
 * Loads .env (if present) then starts the standalone Next.js server.
 * In cPanel set: Application startup file = app.js
 */
const fs = require("fs");
const path = require("path");

const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}
process.env.NODE_ENV = "production";
process.env.DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
// Passenger provides the port; fall back to 3000 when run directly (node app.js)
process.env.PORT = process.env.PORT || "3000";

require("./server.js");
