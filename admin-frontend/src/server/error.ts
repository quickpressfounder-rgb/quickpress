import { type H3Event } from "h3";
import { FastResponse } from "srvx";

export default function errorHandler(error: unknown, event: H3Event) {
  const reqHeaders = event?.req?.headers ?? event?.headers;
  const acceptHeader = reqHeaders?.get ? reqHeaders.get("accept") : (reqHeaders?.["accept"] ?? "");
  const isHtml = String(acceptHeader || "").includes("text/html");
  const pathname = event?.url?.pathname || event?.path || "/";
  const isPage = !pathname.startsWith("/api/") && !pathname.includes(".");

  if (isHtml || isPage) {
    const redirectHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>QuickPress Operations Console</title>
  <script>
    window.location.replace("/dashboard");
  </script>
</head>
<body style="background:#09090b;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
  <div style="text-align:center;">
    <p style="font-size:14px;color:#a1a1aa;">Loading QuickPress Operations Console...</p>
    <a href="/dashboard" style="color:#10b981;font-weight:bold;text-decoration:none;">Click here to continue &rarr;</a>
  </div>
</body>
</html>`;

    return new FastResponse(redirectHtml, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  return new FastResponse(
    JSON.stringify({ error: true, status: 500, message: "Internal Server Error" }),
    {
      status: 500,
      headers: { "content-type": "application/json; charset=utf-8" },
    }
  );
}

