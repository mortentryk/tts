import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b2d8fd51f9ac0b444c48de8a54309829@o4510572767739904.ingest.de.sentry.io/4510572775669840",

  // Set tracesSampleRate to 1.0 to capture 100% of the transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Enable logs
  enableLogs: true,

  // Set environment
  environment: process.env.NODE_ENV || "development",
});

