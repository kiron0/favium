import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["./src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    clean: true,
    minify: "terser",
    target: "es2018",
    treeshake: true,
    esbuildOptions(options) {
      options.drop = ["console", "debugger"];
    },
  },
  {
    entry: {
      cli: "./src/cli/index.ts",
    },
    format: ["cjs"],
    clean: false,
    minify: false,
    platform: "node",
    target: "node18",
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
