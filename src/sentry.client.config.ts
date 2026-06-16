import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://maPezQzmsvJvbhhvEPAkA8jJ@s2525201.eu-nbg-2.betterstackdata.com/2525209",

  // Adjust this value in production, or use 1.0 for testing/full tracing
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console if you're debugging.
  debug: false,
});
