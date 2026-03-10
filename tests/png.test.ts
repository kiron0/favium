import { describe, expect, it } from "vitest";

import PngGenerator from "../src/generators/png";
import { createCanvas, readPngMeta } from "./support/fake-canvas";

describe("PngGenerator", () => {
  it("generates a PNG data URL at the requested size", () => {
    const canvas = createCanvas(24, 24);

    const png = new PngGenerator(canvas).generate(128);
    const meta = readPngMeta(png);

    expect(png.startsWith("data:image/png;base64,")).toBe(true);
    expect(meta).toEqual({
      width: 128,
      height: 128,
      type: "image/png",
    });
  });

  it("rejects invalid sizes", () => {
    const canvas = createCanvas();

    expect(() => new PngGenerator(canvas).generate(-1)).toThrow(RangeError);
  });
});
