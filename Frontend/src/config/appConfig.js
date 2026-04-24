const runtimeConfig =
  typeof window !== "undefined" && typeof window.__APP_CONFIG__ === "object"
    ? window.__APP_CONFIG__
    : {};

const normalizeValue = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const readConfig = (key, fallback = "") => {
  const runtimeValue = normalizeValue(runtimeConfig[key]);
  if (runtimeValue) return runtimeValue;

  const envValue = normalizeValue(import.meta.env[key]);
  if (envValue) return envValue;

  return fallback;
};

const trimTrailingSlash = (value) => value.replace(/\/+$/, "");
const isBrowser = typeof window !== "undefined";
const browserHostname = isBrowser ? window.location.hostname : "";
const browserProtocol = isBrowser ? window.location.protocol : "https:";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

const normalizeLoopbackHostUrl = (value) => {
  if (!isBrowser || !value || !/^https?:\/\//i.test(value)) return value;
  try {
    const parsed = new URL(value);
    const currentHost = window.location.hostname;
    if (
      LOOPBACK_HOSTS.has(parsed.hostname) &&
      LOOPBACK_HOSTS.has(currentHost) &&
      parsed.hostname !== currentHost
    ) {
      parsed.hostname = currentHost;
      return parsed.toString();
    }
  } catch {
    return value;
  }
  return value;
};

const configuredApiUrl = trimTrailingSlash(readConfig("VITE_API_URL", "/api/v1"));
export const apiUrl = trimTrailingSlash(normalizeLoopbackHostUrl(configuredApiUrl));
export const reverbAppKey = readConfig("VITE_REVERB_APP_KEY");
export const reverbScheme = readConfig(
  "VITE_REVERB_SCHEME",
  browserProtocol === "http:" ? "http" : "https",
);
export const reverbHost =
  readConfig("VITE_REVERB_HOST") || browserHostname || "localhost";

const configuredReverbPort = readConfig("VITE_REVERB_PORT");
const fallbackReverbPort = reverbScheme === "https" ? "443" : "8080";
export const reverbPort = configuredReverbPort || fallbackReverbPort;

export const apiOrigin = /^https?:\/\//i.test(apiUrl)
  ? apiUrl.replace(/\/api\/v1\/?$/i, "")
  : "";

