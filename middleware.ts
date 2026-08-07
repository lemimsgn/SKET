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
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
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
  matcher: ["/api/:path*", "/admin/:path*", "/admin"],
};
