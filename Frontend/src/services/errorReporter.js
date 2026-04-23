const reportingEnabled =
  String(import.meta.env.VITE_ERROR_REPORTING_ENABLED ?? "true") === "true";
const endpoint =
  import.meta.env.VITE_ERROR_REPORTING_ENDPOINT ||
  "/api/v1/monitoring/frontend-errors";

async function sendError(payload) {
  if (!reportingEnabled) return;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
