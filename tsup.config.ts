import { defineConfig } from "tsup";

export default defineConfig({
  format: ["cjs", "esm"],
  entry: ["./src/index.ts"],
  dts: true,
  shims: false,
  skipNodeModulesBundle: true,
  clean: true,
  target: "es2017",
  outDir: "dist",
});
