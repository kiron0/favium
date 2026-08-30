import { describe, expect, it } from "vitest";

import { parseCliArgs } from "../src/cli/args";

describe("parseCliArgs", () => {
  it("parses boolean short and long flags", () => {
    expect(parseCliArgs(["-h", "-v"])).toMatchObject({
      help: true,
      version: true,
    });
  });

  it("parses every supported option", () => {
    expect(
      parseCliArgs([
        "--source",
        "logo.webp",
        "--output",
        "public",
        "--preset",
        "web-app",
        "--recursive",
        "--yes",
      ]),
    ).toMatchObject({
      source: "logo.webp",
      output: "public",
      preset: "web-app",
      recursive: true,
      yes: true,
    });
  });

  it.each(["--source", "--output", "--preset"])(
    "rejects missing value for %s",
    (option) => {
      expect(() => parseCliArgs([option])).toThrow(
        `Missing value for ${option}`,
      );
    },
  );

  it("rejects unknown options and invalid presets", () => {
    expect(() => parseCliArgs(["--wat"])).toThrow("Unknown option: --wat");
    expect(() => parseCliArgs(["--preset", "desktop"])).toThrow(
      "Invalid preset: desktop",
    );
  });
});
