import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

import pngToIco from "png-to-ico";
import sharp from "sharp";

export type SourceKind = "current-dir" | "custom-path" | "external-url";
export type FitMode = "cover" | "contain";
export type CliPreset = "default" | "web-app" | "apple-android" | "custom";

export interface LoadedImageSource {
  kind: SourceKind;
  label: string;
  origin: string;
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
  suggestedBaseName: string;
  directory?: string;
}

export interface PngOutputSpec {
  size: number;
  filename: string;
  rel?: "icon" | "apple-touch-icon";
  manifest?: boolean;
  purpose?: "any" | "maskable";
}

export interface ManifestOptions {
  name: string;
  shortName: string;
  backgroundColor: string;
  themeColor: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  startUrl: string;
}

export interface CliGenerationPlan {
  baseName: string;
  outputDir: string;
  fit: FitMode;
  background: string;
  overwrite: boolean;
  icoSizes: number[];
  pngOutputs: PngOutputSpec[];
  htmlSnippet: boolean;
  manifest: boolean;
  manifestFilename: string;
  manifestOptions?: ManifestOptions;
}

export interface GeneratedArtifact {
  type: "ico" | "png" | "html" | "manifest";
  filePath: string;
}

const DEFAULT_ICO_SIZES = [16, 32, 48];
const DEFAULT_PNG_SIZES = [16, 32, 150, 180, 192, 512];
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".heic",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".tif",
  ".tiff",
  ".webp",
]);

export function isSupportedImagePath(filePath: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

export function parseSizeList(input: string): number[] {
  const values = input
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0 && value <= 1024);

  return [...new Set(values)].sort((left, right) => left - right);
}

export async function collectImagesFromDirectory(
  directory: string,
  recursive = false,
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const filePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      if (recursive) {
        files.push(...(await collectImagesFromDirectory(filePath, true)));
      }
      continue;
    }

    if (entry.isFile() && isSupportedImagePath(filePath)) {
      files.push(filePath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

export function isExternalImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function loadImageFromPath(filePath: string): Promise<LoadedImageSource> {
  const absolutePath = resolve(filePath);
  const buffer = await readFile(absolutePath);
  const metadata = await sharp(buffer, { animated: true }).metadata();

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error(`Unsupported image file: ${absolutePath}`);
  }

  return {
    kind: "custom-path",
    label: relative(process.cwd(), absolutePath) || basename(absolutePath),
    origin: absolutePath,
    buffer,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    sizeBytes: buffer.byteLength,
    suggestedBaseName: sanitizeBaseName(basename(absolutePath, extname(absolutePath))),
    directory: dirname(absolutePath),
  };
}

export async function loadImageFromUrl(url: string): Promise<LoadedImageSource> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error(`URL did not return an image. Received content-type: ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer, { animated: true }).metadata();

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error(`Unsupported image payload from ${url}`);
  }

  const urlObject = new URL(url);
  const pathname = urlObject.pathname;
  const rawName = basename(pathname, extname(pathname)) || "favicon";

  return {
    kind: "external-url",
    label: url,
    origin: url,
    buffer,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    sizeBytes: buffer.byteLength,
    suggestedBaseName: sanitizeBaseName(rawName),
  };
}

export function sanitizeBaseName(value: string): string {
  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized || "favicon";
}

export function getPresetBlueprint(
  preset: CliPreset,
  baseName: string,
  pngSizes: number[] = DEFAULT_PNG_SIZES,
  icoSizes: number[] = DEFAULT_ICO_SIZES,
): Pick<
  CliGenerationPlan,
  "icoSizes" | "pngOutputs" | "htmlSnippet" | "manifest" | "manifestFilename"
> {
  if (preset === "custom") {
    return {
      icoSizes,
      pngOutputs: pngSizes.map((size) => ({
        size,
        filename: `${baseName}-${size}x${size}.png`,
        rel: size === 180 ? "apple-touch-icon" : size <= 64 ? "icon" : undefined,
        manifest: size === 192 || size === 512,
      })),
      htmlSnippet: true,
      manifest: pngSizes.includes(192) || pngSizes.includes(512),
      manifestFilename: "manifest.webmanifest",
    };
  }

  if (preset === "apple-android") {
    return {
      icoSizes: [16, 32, 48],
      pngOutputs: [
        { size: 180, filename: "apple-touch-icon.png", rel: "apple-touch-icon" },
        { size: 192, filename: "android-chrome-192x192.png", manifest: true },
        { size: 512, filename: "android-chrome-512x512.png", manifest: true },
      ],
      htmlSnippet: true,
      manifest: true,
      manifestFilename: "manifest.webmanifest",
    };
  }

  if (preset === "web-app") {
    return {
      icoSizes: [16, 32, 48, 64, 256],
      pngOutputs: [
        { size: 16, filename: "favicon-16x16.png", rel: "icon" },
        { size: 32, filename: "favicon-32x32.png", rel: "icon" },
        { size: 64, filename: `${baseName}-64x64.png` },
        { size: 128, filename: `${baseName}-128x128.png` },
        { size: 180, filename: "apple-touch-icon.png", rel: "apple-touch-icon" },
        { size: 192, filename: "android-chrome-192x192.png", manifest: true },
        { size: 256, filename: "android-chrome-256x256.png" },
        { size: 512, filename: "android-chrome-512x512.png", manifest: true },
      ],
      htmlSnippet: true,
      manifest: true,
      manifestFilename: "manifest.webmanifest",
    };
  }

  return {
    icoSizes: DEFAULT_ICO_SIZES,
    pngOutputs: [
      { size: 16, filename: "favicon-16x16.png", rel: "icon" },
      { size: 32, filename: "favicon-32x32.png", rel: "icon" },
      { size: 150, filename: "mstile-150x150.png" },
      { size: 180, filename: "apple-touch-icon.png", rel: "apple-touch-icon" },
      { size: 192, filename: "android-chrome-192x192.png", manifest: true },
      { size: 512, filename: "android-chrome-512x512.png", manifest: true },
    ],
    htmlSnippet: true,
    manifest: true,
    manifestFilename: "manifest.webmanifest",
  };
}

export function renderHtmlSnippet(plan: CliGenerationPlan): string {
  const lines: string[] = [];

  if (plan.icoSizes.length > 0) {
    lines.push(`<link rel="icon" href="./${plan.baseName}.ico" sizes="any">`);
  }

  for (const output of plan.pngOutputs) {
    if (output.rel === "icon") {
      lines.push(
        `<link rel="icon" type="image/png" sizes="${output.size}x${output.size}" href="./${output.filename}">`,
      );
    }

    if (output.rel === "apple-touch-icon") {
      lines.push(
        `<link rel="apple-touch-icon" sizes="${output.size}x${output.size}" href="./${output.filename}">`,
      );
    }
  }

  if (plan.manifest) {
    lines.push(`<link rel="manifest" href="./${plan.manifestFilename}">`);
  }

  return lines.join("\n");
}

export function renderManifest(plan: CliGenerationPlan): string {
  if (!plan.manifestOptions) {
    throw new Error("Manifest options are required when manifest generation is enabled");
  }

  const icons = plan.pngOutputs
    .filter((output) => output.manifest)
    .map((output) => ({
      src: `./${output.filename}`,
      sizes: `${output.size}x${output.size}`,
      type: "image/png",
      purpose: output.purpose ?? "any",
    }));

  return JSON.stringify(
    {
      name: plan.manifestOptions.name,
      short_name: plan.manifestOptions.shortName,
      start_url: plan.manifestOptions.startUrl,
      display: plan.manifestOptions.display,
      background_color: plan.manifestOptions.backgroundColor,
      theme_color: plan.manifestOptions.themeColor,
      icons,
    },
    null,
    2,
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getSuggestedOutputDirectory(source: LoadedImageSource): string {
  return resolve(source.directory ?? process.cwd(), source.suggestedBaseName);
}

export function summarizePlan(source: LoadedImageSource, plan: CliGenerationPlan): string {
  return [
    `Source: ${source.label}`,
    `Image: ${source.width}x${source.height} ${source.format.toUpperCase()} (${formatBytes(source.sizeBytes)})`,
    `Output: ${plan.outputDir}`,
    `ICO sizes: ${plan.icoSizes.length > 0 ? plan.icoSizes.join(", ") : "none"}`,
    `PNG files: ${plan.pngOutputs.map((output) => `${output.filename} (${output.size})`).join(", ")}`,
    `Fit: ${plan.fit}${plan.fit === "contain" ? ` on ${plan.background}` : ""}`,
    `HTML snippet: ${plan.htmlSnippet ? "yes" : "no"}`,
    `Manifest: ${plan.manifest ? "yes" : "no"}`,
  ].join("\n");
}

export async function generateArtifacts(
  source: LoadedImageSource,
  plan: CliGenerationPlan,
): Promise<GeneratedArtifact[]> {
  await mkdir(plan.outputDir, { recursive: true });
  const artifacts: GeneratedArtifact[] = [];
  const pngCache = new Map<number, Buffer>();

  for (const output of plan.pngOutputs) {
    const pngBuffer =
      pngCache.get(output.size) ??
      (await renderPng(source.buffer, output.size, plan.fit, plan.background));
    pngCache.set(output.size, pngBuffer);

    const outputPath = join(plan.outputDir, output.filename);
    await writeFileSafely(outputPath, pngBuffer, plan.overwrite);
    artifacts.push({ type: "png", filePath: outputPath });
  }

  if (plan.icoSizes.length > 0) {
    const icoImages = await Promise.all(
      plan.icoSizes.map((size) =>
        renderPng(source.buffer, size, plan.fit, plan.background),
      ),
    );
    const icoBuffer = await pngToIco(icoImages);
    const icoPath = join(plan.outputDir, `${plan.baseName}.ico`);
    await writeFileSafely(icoPath, icoBuffer, plan.overwrite);
    artifacts.push({ type: "ico", filePath: icoPath });
  }

  if (plan.htmlSnippet) {
    const htmlPath = join(plan.outputDir, `${plan.baseName}.html`);
    await writeFileSafely(htmlPath, renderHtmlSnippet(plan), plan.overwrite, "utf8");
    artifacts.push({ type: "html", filePath: htmlPath });
  }

  if (plan.manifest) {
    const manifestPath = join(plan.outputDir, plan.manifestFilename);
    await writeFileSafely(manifestPath, renderManifest(plan), plan.overwrite, "utf8");
    artifacts.push({ type: "manifest", filePath: manifestPath });
  }

  return artifacts;
}

async function renderPng(
  input: Buffer,
  size: number,
  fit: FitMode,
  background: string,
): Promise<Buffer> {
  return sharp(input, { animated: true })
    .rotate()
    .resize(size, size, {
      fit,
      background,
    })
    .png()
    .toBuffer();
}

async function writeFileSafely(
  filePath: string,
  contents: string | Buffer,
  overwrite: boolean,
  encoding?: BufferEncoding,
): Promise<void> {
  if (!overwrite) {
    try {
      await stat(filePath);
      throw new Error(`Refusing to overwrite existing file: ${filePath}`);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
    }
  }

  if (typeof contents === "string") {
    await writeFile(filePath, contents, encoding ?? "utf8");
    return;
  }

  await writeFile(filePath, contents);
}
