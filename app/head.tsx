const isDev = process.env.NODE_ENV === "development";
const csp = isDev
  ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self';"
  : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self';";

export default function Head() {
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
    </>
  );
}
