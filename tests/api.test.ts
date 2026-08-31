import { describe, expect, it } from "vitest";

import {
  CanvasResize,
  FaviconComposer,
  IcoGenerator,
  ImageBundleGenerator,
  MAX_CANVAS_DIMENSION,
  MAX_CANVAS_PIXELS,
  PngGenerator,
  TextIconGenerator,
} from "../src";
import { createCanvas } from "./support/fake-canvas";

describe("public API", () => {
  it("exports all public classes", () => {
    expect(FaviconComposer).toBeTypeOf("function");
    expect(ImageBundleGenerator).toBeTypeOf("function");
    expect(IcoGenerator).toBeTypeOf("function");
    expect(PngGenerator).toBeTypeOf("function");
    expect(CanvasResize).toBeTypeOf("function");
    expect(TextIconGenerator).toBeTypeOf("function");
    expect(MAX_CANVAS_DIMENSION).toBe(4096);
    expect(MAX_CANVAS_PIXELS).toBe(4096 * 4096);
  });

  it("rejects excessive source canvas dimensions", () => {
    expect(() => new FaviconComposer(createCanvas(4097, 1))).toThrow(
      "must not exceed 4096x4096",
    );
  });

  it("rejects non-canvas input across constructors", () => {
    const invalidCanvas = {} as HTMLCanvasElement;

    expect(() => new FaviconComposer(invalidCanvas)).toThrow(TypeError);
    expect(() => new ImageBundleGenerator(invalidCanvas)).toThrow(TypeError);
    expect(() => new IcoGenerator(invalidCanvas)).toThrow(TypeError);
    expect(() => new PngGenerator(invalidCanvas)).toThrow(TypeError);
    expect(() => new CanvasResize(invalidCanvas)).toThrow(TypeError);
    expect(() => new TextIconGenerator(invalidCanvas)).toThrow(TypeError);
  });

  it("allows the exported classes to be used end-to-end", () => {
    const canvas = createCanvas(128, 128);

    expect(new ImageBundleGenerator(canvas).generate().png192).toContain(
      "data:image/png;base64,",
    );
    expect(new IcoGenerator(canvas).generate()).toContain(
      "data:image/x-icon;base64,",
    );
    expect(new PngGenerator(canvas).generate(32)).toContain(
      "data:image/png;base64,",
    );
    expect(new CanvasResize(canvas).resize(24, 24).width).toBe(24);
  });
});
