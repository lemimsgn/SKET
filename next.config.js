/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";
const csp = isDev
  ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self';"
  : "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self';";

const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'Strict-Transport-Security',
            value: isDev ? 'max-age=0' : 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
