# Favium

Favium generates favicon assets from an `HTMLCanvasElement` in the browser and from image files in the terminal.

## Features

- Generate multi-size ICO files from a canvas
- Generate PNG favicons at arbitrary sizes
- Produce a default favicon bundle or a custom size set
- Create text-based icons with configurable colors, corners, and pixel ratio
- Generate favicon files from local images or external image URLs through an interactive CLI

## Installation

```bash
npm install favium
```

## CLI

Favium ships with an interactive terminal workflow:

```bash
npx favium
```

The CLI can:

- scan the current directory for valid images
- accept a custom local file or directory path
- download and validate an external image URL
- generate `default`, `web-app`, `apple-android`, or fully custom icon sets
- choose output directory, base filename, fit mode, overwrite behavior, HTML snippet, and web manifest
- retry interactive prompts when an entered path, URL, or size list is invalid

By default, Favium writes generated assets into a same-name directory beside the source image.

Example:

```text
source: ./logo.png
output: ./logo/
```

If the source is `./logo.png` and the base name stays `logo`, generated files typically include:

- `logo.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`
- `logo.html`
- `manifest.webmanifest`

Non-interactive example:

```bash
favium --source ./logo.png --preset web-app --yes
```

CLI options:

```text
-h, --help       Show this help message
-v, --version    Show the current version
--source         Local file, local directory, or external image URL
--output         Output directory
--preset         default | web-app | apple-android | custom
--recursive      Recursively scan directories for valid images
-y, --yes        Accept defaults for optional prompts
```

Preset summary:

- `default`: classic favicon output including `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `mstile-150x150.png`, HTML, and `manifest.webmanifest`
- `web-app`: broader modern set including extra `64`, `128`, and `256` PNG outputs plus `favicon.ico`
- `apple-android`: focused mobile-oriented set with Apple touch icon, Android icons, and a smaller ICO
- `custom`: custom PNG sizes and ICO sizes, with filenames generated from the chosen base name

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

Top-level exports:

```ts
import {
  CanvasResize,
  FaviconComposer,
  IcoGenerator,
  ImageBundleGenerator,
  PngGenerator,
  TextIconGenerator,
} from "favium";
```

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
- The CLI uses Sharp and png-to-ico to generate real favicon files in Node.js.
- CLI manifest output is written as `manifest.webmanifest`.

## License

MIT © Toufiq Hasan Kiron

_"From canvas to favicon, your icon journey starts here."_ - Favium Motto
