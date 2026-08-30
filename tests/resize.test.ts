import { describe, expect, it } from "vitest";

import Resize from "../src/utils/resize";
import { createCanvas } from "./support/fake-canvas";

describe("Resize", () => {
  it("returns the requested dimensions when upscaling", () => {
    const canvas = createCanvas(32, 32);

    const resized = new Resize(canvas).resize(128, 128);

    expect(resized.width).toBe(128);
    expect(resized.height).toBe(128);
  });

  it("returns the requested dimensions when downscaling", () => {
    const canvas = createCanvas(512, 512);

    const resized = new Resize(canvas).resize(64, 64);

    expect(resized.width).toBe(64);
    expect(resized.height).toBe(64);
  });

  it("rejects non-positive dimensions", () => {
    const canvas = createCanvas();

    expect(() => new Resize(canvas).resize(0, 32)).toThrow(RangeError);
  });

  it.each([
    [1.5, 32],
    [32, Number.NaN],
    [Number.POSITIVE_INFINITY, 32],
  ])("rejects non-integer dimensions %s x %s", (width, height) => {
    expect(() => new Resize(createCanvas()).resize(width, height)).toThrow(
      "Width and height must be integers",
    );
  });
});
