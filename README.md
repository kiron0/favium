# Favium 🎨

[![npm version](https://img.shields.io/npm/v/favium.svg?style=flat-square)](https://www.npmjs.com/package/favium)
[![npm downloads](https://img.shields.io/npm/dm/favium.svg?style=flat-square)](https://www.npmjs.com/package/favium)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg?style=flat-square)](https://www.typescriptlang.org/)

**Favium is a lightweight package that allows you to create ICO and PNG formatted favicons from a canvas element.**

_"Craft Your Perfect Favicon with Ease"_ 🚀

---

## 🌟 Features

- **Multi-Format Support** - Generate ICO and PNG favicons
- **Flexible Sizing** - Create favicons at any size with quality-preserving resize
- **Zero Dependencies** - Pure TypeScript implementation
- **Browser-Focused** - Optimized for web applications
- **TypeScript First** - Full type safety and inference
- **Bundled Output** - Convenient bundle of common favicon sizes

---

## 📦 Installation

```bash
npm install favium
# or
yarn add favium
# or
bun add favium
```

---

## 🚀 Quick Start

```typescript
import { FaviconComposer } from "favium";

// Create a canvas
const canvas = document.createElement("canvas");
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext("2d");
if (ctx) {
  ctx.fillStyle = "blue";
  ctx.fillRect(0, 0, 512, 512);
}

const favicon = new FaviconComposer(canvas);

// Generate a full favicon bundle
const bundle = favicon.bundle();

// Generate specific formats
const ico = favicon.ico([16, 32, 64]);
const png64 = favicon.png(64);
```

---

## 📚 Core Features

### 🖼️ Favicon Bundle

```typescript
import { FaviconComposer } from "favium";

const canvas = document.createElement("canvas");
// ... canvas setup ...

const favicon = new FaviconComposer(canvas);
const bundle = favicon.bundle();
// Returns {
//   ico: string,    // Multi-size ICO (16, 32, 48)
//   png16: string,
//   png32: string,
//   png150: string,
//   png180: string,
//   png192: string,
//   png512: string
// }
```

### 🌐 ICO Generation

```typescript
import { FaviconComposer } from "favium";

const favicon = new FaviconComposer(canvas);
const ico = favicon.ico([16, 32, 64]); // Custom sizes
// Returns "data:image/x-icon;base64,..."
```

### 🖌️ PNG Generation

```typescript
import { FaviconComposer } from "favium";

const favicon = new FaviconComposer(canvas);
const png32 = favicon.png(32); // Any size
// Returns "data:image/png;base64,..."
```

### 📏 Canvas Resizing

```typescript
import { FaviconComposer } from "favium";

const favicon = new FaviconComposer(canvas);
const resized = favicon.resize(64); // Returns HTMLCanvasElement
```

### 🖼️ Text Icon Generator

```typescript
import { TextIconGenerator, FaviconComposer } from "favium";

const canvas = document.createElement("canvas");
const textIcon = new TextIconGenerator(canvas);
textIcon.generate({
  text: "A",
  backgroundColor: "#ff0000",
  shape: "circle",
  width: 512,
  height: 512,
});

const favicon = new FaviconComposer(canvas);
const bundle = favicon.bundle();
```

---

## 💡 Why Favium?

- **Versatile**: Supports both ICO and PNG formats with custom sizes
- **TypeScript Optimized**: Full type safety and IDE support
- **Lightweight**: No external dependencies, minimal footprint
- **Quality**: Progressive resizing for optimal image quality
- **Simple API**: Intuitive interface for favicon generation

---

## 🛠️ Contributing

```bash
# Clone repo
git clone https://github.com/kiron0/favium.git

# Install dependencies
bun install

# Build project
bun run build
```

Contributions are welcome! Please submit pull requests or open issues on GitHub.

---

## 📜 License

MIT © Toufiq Hasan Kiron

_"From canvas to favicon, your icon journey starts here."_ - Favium Motto 🎨
