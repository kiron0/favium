import { defineConfig } from "tsup";
import { fileURLToPath } from "node:url";

export default defineConfig({
  entry: {
    cli: fileURLToPath(new URL("../src/cli/index.ts", import.meta.url)),
  },
  outDir: fileURLToPath(new URL("./dist", import.meta.url)),
  format: ["cjs"],
  clean: true,
  minify: false,
  platform: "node",
  target: "node22",
  external: ["@clack/prompts", "png-to-ico", "sharp"],
  banner: { js: "#!/usr/bin/env node" },
});
