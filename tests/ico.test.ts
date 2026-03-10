import { describe, expect, it } from "vitest";

import IcoGenerator from "../src/generators/ico";
import { createCanvas, decodeIco } from "./support/fake-canvas";

function readEntry(bytes: Uint8Array, index: number) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = 6 + index * 16;

  return {
    width: view.getUint8(offset),
    height: view.getUint8(offset + 1),
    size: view.getUint32(offset + 8, true),
    imageOffset: view.getUint32(offset + 12, true),
  };
}

describe("IcoGenerator", () => {
  it("encodes valid directory entries and bitmap sizes", () => {
    const canvas = createCanvas(32, 32);

    const ico = new IcoGenerator(canvas).generate([16, 32, 256]);
    const bytes = decodeIco(ico);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(ico.startsWith("data:image/x-icon;base64,")).toBe(true);
    expect(view.getUint16(0, true)).toBe(0);
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(3);

    const first = readEntry(bytes, 0);
    const second = readEntry(bytes, 1);
    const third = readEntry(bytes, 2);

    expect(first.width).toBe(16);
    expect(second.width).toBe(32);
    expect(third.width).toBe(0);
    expect(third.height).toBe(0);

    expect(first.size).toBe(40 + 16 * 16 * 4 + Math.ceil(16 / 32) * 4 * 16);
    expect(second.size).toBe(40 + 32 * 32 * 4 + Math.ceil(32 / 32) * 4 * 32);
    expect(third.size).toBe(
      Buffer.from(
        createCanvas(256, 256).toDataURL("image/png").split(",")[1]!,
        "base64",
      ).length,
    );

    expect(first.imageOffset).toBe(6 + 16 * 3);
    expect(second.imageOffset).toBe(first.imageOffset + first.size);
    expect(third.imageOffset).toBe(second.imageOffset + second.size);
  });

  it("rejects sizes outside the ICO range", () => {
    const canvas = createCanvas();

    expect(() => new IcoGenerator(canvas).generate([])).toThrow(RangeError);
    expect(() => new IcoGenerator(canvas).generate([0])).toThrow(RangeError);
    expect(() => new IcoGenerator(canvas).generate([257])).toThrow(RangeError);
  });

  it("keeps the requested image count with default sizes", () => {
    const canvas = createCanvas(512, 512);

    const ico = new IcoGenerator(canvas).generate();
    const bytes = decodeIco(ico);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    expect(view.getUint16(4, true)).toBe(3);
    expect(readEntry(bytes, 0).width).toBe(16);
    expect(readEntry(bytes, 1).width).toBe(32);
    expect(readEntry(bytes, 2).width).toBe(48);
  });
});
