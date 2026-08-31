import { defineConfig } from "tsup";

export default defineConfig({
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
});
