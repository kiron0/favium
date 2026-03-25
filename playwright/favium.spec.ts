import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    favium: Record<string, unknown>;
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/playwright/fixtures/index.html");
  await page.waitForFunction(() => typeof window.favium !== "undefined");
});

test("generates browser-valid PNGs and configurable bundles", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const { FaviconComposer } = window.favium as {
      FaviconComposer: new (canvas: HTMLCanvasElement) => {
        png: (size: number) => string;
        bundle: (options: { icoSizes: number[]; pngSizes: number[] }) => {
          pngs: Record<number, string>;
        };
      };
    };

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(256, 256, 140, 0, Math.PI * 2);
    ctx.fill();

    const favicon = new FaviconComposer(canvas);
    const png = favicon.png(128);
    const bundle = favicon.bundle({
      icoSizes: [16, 32, 256],
      pngSizes: [64, 128, 512],
    });

    const readSize = async (dataUrl: string) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
    };

    return {
      pngPrefix: png.slice(0, 22),
      png128: await readSize(png),
      bundleKeys: Object.keys(bundle.pngs),
      bundle64: await readSize(bundle.pngs[64]),
      bundle512: await readSize(bundle.pngs[512]),
    };
  });

  expect(result.pngPrefix).toBe("data:image/png;base64,");
  expect(result.png128).toEqual({ width: 128, height: 128 });
  expect(result.bundleKeys).toEqual(["64", "128", "512"]);
  expect(result.bundle64).toEqual({ width: 64, height: 64 });
  expect(result.bundle512).toEqual({ width: 512, height: 512 });
});

test("encodes 256x256 ICO entries as PNG and honors text icon pixel ratio", async ({
  page,
}) => {
  const result = await page.evaluate(() => {
    const { FaviconComposer, TextIconGenerator } = window.favium as {
      FaviconComposer: new (canvas: HTMLCanvasElement) => {
        ico: (sizes: number[]) => string;
      };
      TextIconGenerator: {
        generate: (options: {
          text: string;
          width: number;
          height: number;
          pixelRatio: number;
        }) => HTMLCanvasElement;
      };
    };

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");

    ctx.fillStyle = "#dc2626";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const ico = new FaviconComposer(canvas).ico([16, 32, 256]);
    const bytes = Uint8Array.from(atob(ico.split(",")[1]), (char) =>
      char.charCodeAt(0),
    );
    const view = new DataView(bytes.buffer);
    const thirdEntryOffset = 6 + 16 * 2;
    const thirdOffset = view.getUint32(thirdEntryOffset + 12, true);
    const pngSignature = Array.from(bytes.slice(thirdOffset, thirdOffset + 8));

    const iconCanvas = TextIconGenerator.generate({
      text: "F",
      width: 64,
      height: 64,
      pixelRatio: 2,
    });

    return {
      imageCount: view.getUint16(4, true),
      thirdWidth: view.getUint8(thirdEntryOffset),
      thirdHeight: view.getUint8(thirdEntryOffset + 1),
      pngSignature,
      iconWidth: iconCanvas.width,
      iconHeight: iconCanvas.height,
      styleWidth: iconCanvas.style.width,
      styleHeight: iconCanvas.style.height,
    };
  });

  expect(result.imageCount).toBe(3);
  expect(result.thirdWidth).toBe(0);
  expect(result.thirdHeight).toBe(0);
  expect(result.pngSignature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(result.iconWidth).toBe(128);
  expect(result.iconHeight).toBe(128);
  expect(result.styleWidth).toBe("64px");
  expect(result.styleHeight).toBe("64px");
});
