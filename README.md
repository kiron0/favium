# Favium

Favium generates favicon assets from an `HTMLCanvasElement` in the browser.

## Features

- Generate multi-size ICO files from a canvas
- Generate PNG favicons at arbitrary sizes
- Produce a default favicon bundle or a custom size set
- Create text-based icons with configurable colors, corners, and pixel ratio
- Ship as a small dependency-free TypeScript package

## Installation

```bash
npm install favium
```

## Requirements

- Browser or browser-like runtime with `document`, `HTMLCanvasElement`, and `CanvasRenderingContext2D`
- Canvas content must be origin-clean if you want `getImageData()` and `toDataURL()` to succeed

## Quick Start

```ts
import { FaviconComposer } from "favium";

const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2D context unavailable");

ctx.fillStyle = "#2563eb";
ctx.fillRect(0, 0, 512, 512);

const favicon = new FaviconComposer(canvas);
const bundle = favicon.bundle();

console.log(bundle.ico);
console.log(bundle.png32);
console.log(bundle.png512);
console.log(bundle.pngs[180]);
```

## API

### `FaviconComposer`

```ts
import { FaviconComposer } from "favium";

const favicon = new FaviconComposer(canvas);

const ico = favicon.ico([16, 32, 64, 256]);
const png = favicon.png(180);
const resized = favicon.resize(128);
const bundle = favicon.bundle();
const customBundle = favicon.bundle({
  icoSizes: [32, 64, 256],
  pngSizes: [64, 128, 256, 512],
});
```

`bundle()` returns the legacy named PNG fields plus a `pngs` size map:

```ts
{
  ico: string,
  pngs: Record<number, string>,
  png16: string,
  png32: string,
  png150: string,
  png180: string,
  png192: string,
  png512: string
}
```

When you pass custom bundle options, the result always includes:

```ts
{
  ico: string,
  pngs: Record<number, string>
}
```

Named fields such as `png32` or `png512` are also included when those standard sizes are part of `pngSizes`.

### `TextIconGenerator`

```ts
import { TextIconGenerator } from "favium";

const canvas = document.createElement("canvas");

new TextIconGenerator(canvas).generate({
  text: "F",
  width: 128,
  height: 128,
  backgroundColor: "#111827",
  fontColor: "#ffffff",
  cornerRadius: 24,
  pixelRatio: window.devicePixelRatio,
});
```

You can also create a new canvas directly:

```ts
const iconCanvas = TextIconGenerator.generate({
  text: "A",
  backgroundColor: "#dc2626",
});
```

If `pixelRatio` is omitted, Favium uses `window.devicePixelRatio` when available and falls back to `1`.

## Notes

- ICO generation uses PNG-compressed payloads for `256x256` entries to improve compatibility with common icon readers.
- `IcoGenerator.generate()` requires at least one size.
- `Resize` progressively downsamples large canvases before the final draw for better output quality.

## License

MIT © Toufiq Hasan Kiron

_"From canvas to favicon, your icon journey starts here."_ - Favium Motto
