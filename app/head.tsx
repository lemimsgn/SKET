import { headers } from "next/headers";

const isDev = process.env.NODE_ENV === "development";
const allowInline = (process.env.NEXT_PUBLIC_ALLOW_INLINE_SCRIPTS || "false").toLowerCase() === "true";

export default async function Head() {
  const hdrs = await headers();
  // headers() may be a Promise in this Next.js version
  const nonce = (hdrs as any).get ? (hdrs as any).get("x-csp-nonce") || "" : "";

  const firebaseConnectSrc = isDev
    ? "'self' https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com"
    : "'self' https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com";

  const scriptNonce = nonce ? `'nonce-${nonce}'` : "'self'";
  const csp = isDev
    ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${scriptNonce}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src ${firebaseConnectSrc}; font-src 'self'; frame-ancestors 'none'; base-uri 'self';`
    : `default-src 'self'; script-src ${scriptNonce} ${allowInline ? "'unsafe-inline' " : ""}'strict-dynamic' https:; style-src 'self'; img-src 'self' data:; connect-src ${firebaseConnectSrc}; font-src 'self'; frame-ancestors 'none'; base-uri 'self';`;

  return (
    <>
      <meta name="application-name" content="SKET" />
      <meta name="theme-color" content="#1f2937" />
      <meta name="description" content="Learn skills, grow your network, and earn referral rewards." />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content="SKET" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta httpEquiv="Content-Security-Policy" content={csp} />
      <meta httpEquiv="X-Frame-Options" content="DENY" />
      <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" href="/icons/icon-192.png" />
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      {nonce && (
        // expose nonce to client scripts that may need it
        // the script itself is small and is rendered with the same nonce
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: `window.__CSP_NONCE='${nonce}';` }} />
      )}
    </>
  );
}
