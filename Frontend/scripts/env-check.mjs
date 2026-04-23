import fs from "node:fs";
import path from "node:path";

const required = [
  "VITE_API_URL",
  "VITE_REVERB_HOST",
  "VITE_REVERB_PORT",
  "VITE_REVERB_SCHEME",
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const vars = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    vars[key] = value;
  }
  return vars;
}

const cwd = process.cwd();
const envValues = {
  ...parseEnvFile(path.join(cwd, ".env.example")),
  ...parseEnvFile(path.join(cwd, ".env")),
  ...process.env,
};

const missing = required.filter((key) => {
  const value = envValues[key];
  return typeof value !== "string" || value.trim() === "";
});

if (missing.length > 0) {
  console.error("[env-check] Missing required environment variables:");
  missing.forEach((key) => console.error(` - ${key}`));
  process.exit(1);
}

console.log("[env-check] OK");
