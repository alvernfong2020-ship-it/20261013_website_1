import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // next-auth's internals import the extensionless specifier "next/server",
      // which the package does not export for ESM resolution in a bare runner.
      "next/server": fileURLToPath(new URL("./node_modules/next/server.js", import.meta.url)),
      "next/navigation": fileURLToPath(new URL("./tests/mocks/next-navigation.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        // Force vite to resolve next-auth's internal "next/server" import through
        // the alias above instead of treating it as an external node dependency.
        inline: ["next-auth", "@auth/core", "next"],
      },
    },
  },
});
