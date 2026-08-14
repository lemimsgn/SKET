import { NextResponse, type NextRequest } from "next/server";

const allowedOrigins = (process.env.API_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .map((origin) => {
    try {
      return new URL(origin).origin;
    } catch {
      return "";
    }
  })
  .filter(Boolean);

const isDev = process.env.NODE_ENV === "development";
// Opt-in temporary override to allow inline scripts in production for troubleshooting.
// Set ALLOW_INLINE_SCRIPTS=true in Vercel Environment Variables only while testing,
// then remove it and redeploy. Default is secure (no 'unsafe-inline').
const allowInline = (process.env.ALLOW_INLINE_SCRIPTS || "false").toLowerCase() === "true";
const cspScriptSrc = isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'";
const cspStyleSrc = isDev ? "'self' 'unsafe-inline'" : "'self'";

const firebaseConnectSrc = isDev
  ? "'self' https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com"
  : "'self' https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com";

const securityHeaders: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=(), interest-cohort=()",
  "X-XSS-Protection": "1; mode=block",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Content-Security-Policy": `default-src 'self'; script-src ${cspScriptSrc}; style-src ${cspStyleSrc}; img-src 'self' data:; connect-src ${firebaseConnectSrc}; font-src 'self'; frame-ancestors 'none'; base-uri 'self';`,
};

function getAllowedOrigin(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;

  if (!origin) {
    return requestOrigin;
  }

  if (origin === requestOrigin) {
    return origin;
  }

  if (allowedOrigins.includes(origin)) {
    return origin;
  }

  return null;
}

function setCorsHeaders(response: NextResponse, origin: string): void {
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
}

function setSecurityHeaders(response: NextResponse): void {
  // Generate a per-request nonce for CSP
  let nonce = "";
  try {
    const arr = crypto.getRandomValues(new Uint8Array(16));
    nonce = Array.from(arr).map((b) => ("0" + b.toString(16)).slice(-2)).join("");
  } catch (e) {
    // Fallback to timestamp-based nonce if crypto unavailable
    nonce = String(Date.now());
  }

  const scriptNonceToken = `'nonce-${nonce}'`;
  // In production, include the nonce. If `ALLOW_INLINE_SCRIPTS=true` is set,
  // also include 'unsafe-inline' temporarily to help verify CSP-related blocking.
  const scriptSrc = isDev
    ? `${cspScriptSrc} ${scriptNonceToken}`
    : `${cspScriptSrc} ${allowInline ? "'unsafe-inline'" : ""} ${scriptNonceToken}`;

  const csp = `default-src 'self'; script-src ${scriptSrc}; style-src ${cspStyleSrc}; img-src 'self' data:; connect-src ${firebaseConnectSrc}; font-src 'self'; frame-ancestors 'none'; base-uri 'self';`;

  // set headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (key === "Content-Security-Policy") {
      response.headers.set(key, csp);
    } else {
      response.headers.set(key, value);
    }
  });

  // expose nonce to server-rendered pages via a header so head.tsx can read it
  response.headers.set("x-csp-nonce", nonce);
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  setSecurityHeaders(response);

  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return response;
  }

  const origin = getAllowedOrigin(request);
  if (!origin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (request.method === "OPTIONS") {
    const optionsResponse = new NextResponse(null, { status: 204 });
    setSecurityHeaders(optionsResponse);
    setCorsHeaders(optionsResponse, origin);
    return optionsResponse;
  }

  setCorsHeaders(response, origin);
  return response;
}

export const config = {
  // Apply middleware to all site pages so security headers (CSP + nonce)
  // are present on document responses. Exclude Next.js static assets
  // to avoid interfering with asset delivery.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
