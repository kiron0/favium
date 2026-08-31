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

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid size %s",
    (size) => {
      const canvas = createCanvas();

      expect(() => new PngGenerator(canvas).generate(size)).toThrow(RangeError);
    },
  );

  it("rejects excessive output size", () => {
    expect(() => new PngGenerator(createCanvas()).generate(4097)).toThrow(
      "must not exceed 4096x4096",
    );
  });
});
