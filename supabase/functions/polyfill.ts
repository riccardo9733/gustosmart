// Polyfill process.env for Deno environment compatibility with Node/Next.js code
if (!globalThis.process) {
  globalThis.process = {
    env: new Proxy({}, {
      get: (_target, prop) => {
        return Deno.env.get(String(prop));
      },
    }),
  } as any;
}
