const reportingEnabled =
  String(import.meta.env.VITE_ERROR_REPORTING_ENABLED ?? "true") === "true";
const endpoint =
  import.meta.env.VITE_ERROR_REPORTING_ENDPOINT ||
  "/api/v1/monitoring/frontend-errors";
const visioMetricsEndpoint =
  import.meta.env.VITE_VISIO_METRICS_ENDPOINT ||
  "/api/v1/monitoring/visio-metrics";

function getCookieValue(name) {
  const escaped = name.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function buildMonitoringHeaders() {
  const headers = { "Content-Type": "application/json" };
  const csrfToken = getCookieValue("XSRF-TOKEN");
  if (csrfToken) {
    headers["X-XSRF-TOKEN"] = csrfToken;
  }
  return headers;
}

async function sendError(payload) {
  if (!reportingEnabled) return;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: buildMonitoringHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch (_e) {
    // Never throw from client-side monitoring.
  }
}

async function sendMonitoringPayload(targetEndpoint, payload) {
  if (!reportingEnabled) return;
  try {
    await fetch(targetEndpoint, {
      method: "POST",
      headers: buildMonitoringHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
  } catch (_e) {
    // Never throw from client-side monitoring.
  }
}

export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    void sendError({
      message: event.message || "Unknown runtime error",
      source: event.filename || "",
      stack: event.error?.stack || "",
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    void sendError({
      message:
        (reason && (reason.message || String(reason))) ||
        "Unhandled promise rejection",
      source: "unhandledrejection",
      stack: reason?.stack || "",
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  });
}

export function reportReactError(error, errorInfo) {
  void sendError({
    message: error?.message || "React render error",
    source: "ErrorBoundary",
    stack: `${error?.stack || ""}\n${errorInfo?.componentStack || ""}`,
    url: window.location.href,
    userAgent: navigator.userAgent,
  });
}

export function reportVisioMetric(metric, data = {}) {
  void sendMonitoringPayload(visioMetricsEndpoint, {
    metric,
    data,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  });
}
