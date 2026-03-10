import { describe, expect, it } from "vitest";

import FaviconComposer from "../src/composer/favicon";
import BundleGenerator from "../src/generators/bundle";
import TextIconGenerator from "../src/generators/center";
import {
  createCanvas,
  getCanvasOperations,
  readPngMeta,
  setDevicePixelRatio,
} from "./support/fake-canvas";

describe("FaviconComposer", () => {
  it("builds the expected bundle formats", () => {
    const canvas = createCanvas(64, 64);

    const bundle = new FaviconComposer(canvas).bundle();

    expect(bundle.ico.startsWith("data:image/x-icon;base64,")).toBe(true);
    expect(Object.keys(bundle.pngs)).toEqual(["16", "32", "150", "180", "192", "512"]);
    expect(readPngMeta(bundle.png16)).toMatchObject({ width: 16, height: 16 });
    expect(readPngMeta(bundle.png32)).toMatchObject({ width: 32, height: 32 });
    expect(readPngMeta(bundle.png150)).toMatchObject({
      width: 150,
      height: 150,
    });
    expect(readPngMeta(bundle.png180)).toMatchObject({
      width: 180,
      height: 180,
    });
    expect(readPngMeta(bundle.png192)).toMatchObject({
      width: 192,
      height: 192,
    });
    expect(readPngMeta(bundle.png512)).toMatchObject({
      width: 512,
      height: 512,
    });
    expect(readPngMeta(bundle.pngs[512])).toMatchObject({
      width: 512,
      height: 512,
    });
  });

  it("resizes through the public API", () => {
    const canvas = createCanvas(48, 48);

    const resized = new FaviconComposer(canvas).resize(96);

    expect(resized.width).toBe(96);
    expect(resized.height).toBe(96);
  });

  it("generates direct ICO and PNG outputs", () => {
    const canvas = createCanvas(40, 40);
    const favicon = new FaviconComposer(canvas);

    const ico = favicon.ico([16, 32]);
    const png = favicon.png(64);

    expect(ico.startsWith("data:image/x-icon;base64,")).toBe(true);
    expect(readPngMeta(png)).toMatchObject({ width: 64, height: 64 });
  });

  it("supports custom bundle size selection", () => {
    const canvas = createCanvas(64, 64);

    const bundle = new FaviconComposer(canvas).bundle({
      icoSizes: [32, 64],
      pngSizes: [64, 128],
    });

    expect(Object.keys(bundle.pngs)).toEqual(["64", "128"]);
    expect(bundle.png16).toBeUndefined();
    expect(readPngMeta(bundle.pngs[64])).toMatchObject({ width: 64, height: 64 });
    expect(readPngMeta(bundle.pngs[128])).toMatchObject({
      width: 128,
      height: 128,
    });
  });
});

describe("BundleGenerator", () => {
  it("returns the same bundle contract directly", () => {
    const canvas = createCanvas(128, 128);

    const bundle = new BundleGenerator(canvas).generate();

    expect(Object.keys(bundle)).toEqual([
      "ico",
      "pngs",
      "png16",
      "png32",
      "png150",
      "png180",
      "png192",
      "png512",
    ]);
  });
});

describe("TextIconGenerator", () => {
  it("draws background and text on the provided canvas", () => {
    const canvas = createCanvas();

    const generated = new TextIconGenerator(canvas).generate({
      text: "F",
      width: 64,
      height: 64,
      cornerRadius: 12,
    });

    expect(generated.width).toBe(64);
    expect(generated.height).toBe(64);
    expect(generated.style.width).toBe("64px");
    expect(generated.style.height).toBe("64px");
    expect(
      getCanvasOperations(generated).some((operation) =>
        operation.startsWith("fillText:F@"),
      ),
    ).toBe(true);
    expect(getCanvasOperations(generated)).toContain("setTransform:1x1");
  });

  it("supports omitting text and uses a square background by default", () => {
    const canvas = createCanvas();

    const generated = new TextIconGenerator(canvas).generate({
      text: null,
      width: 32,
      height: 32,
    });

    expect(getCanvasOperations(generated)).toContain("fillRect:0,0,32,32");
    expect(
      getCanvasOperations(generated).some((operation) =>
        operation.startsWith("fillText:"),
      ),
    ).toBe(false);
  });

  it("creates a canvas through the static generator", () => {
    const generated = TextIconGenerator.generate({
      text: "S",
      width: 48,
      height: 48,
    });

    expect(generated).toBeInstanceOf(HTMLCanvasElement);
    expect(generated.width).toBe(48);
    expect(generated.height).toBe(48);
  });

  it("uses the global device pixel ratio by default", () => {
    setDevicePixelRatio(3);

    const generated = TextIconGenerator.generate({
      text: "D",
      width: 20,
      height: 10,
    });

    expect(generated.width).toBe(60);
    expect(generated.height).toBe(30);
    expect(getCanvasOperations(generated)).toContain("setTransform:3x3");

    setDevicePixelRatio(1);
  });

  it("allows overriding the pixel ratio explicitly", () => {
    setDevicePixelRatio(3);

    const generated = TextIconGenerator.generate({
      text: "P",
      width: 30,
      height: 20,
      pixelRatio: 2,
    });

    expect(generated.width).toBe(60);
    expect(generated.height).toBe(40);
    expect(getCanvasOperations(generated)).toContain("setTransform:2x2");

    setDevicePixelRatio(1);
  });
});
