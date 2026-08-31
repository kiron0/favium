import {
  copyFile,
  lstat,
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { randomUUID } from "node:crypto";
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
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
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

export async function loadImageFromPath(
  filePath: string,
): Promise<LoadedImageSource> {
  const absolutePath = resolve(filePath);
  const details = await stat(absolutePath);
  if (details.size > MAX_SOURCE_BYTES) {
    throw new RangeError(
      `Image exceeds ${formatBytes(MAX_SOURCE_BYTES)} limit`,
    );
  }
  const buffer = await readFile(absolutePath);
  const metadata = await sharp(buffer, { animated: true }).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error(`Unsupported image file: ${absolutePath}`);
  }

  return {
    kind: "custom-path",
    label: relative(process.cwd(), absolutePath) || basename(absolutePath),
    origin: absolutePath,
    buffer,
    width: metadata.width,
    height: metadata.pageHeight ?? metadata.height,
    format: metadata.format,
    sizeBytes: buffer.byteLength,
    suggestedBaseName: sanitizeBaseName(
      basename(absolutePath, extname(absolutePath)),
    ),
    directory: dirname(absolutePath),
  };
}

export async function loadImageFromUrl(
  url: string,
): Promise<LoadedImageSource> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch image: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type");
  if (contentType && !contentType.startsWith("image/")) {
    throw new Error(
      `URL did not return an image. Received content-type: ${contentType}`,
    );
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    throw new RangeError(
      `Image exceeds ${formatBytes(MAX_SOURCE_BYTES)} limit`,
    );
  }

  const buffer = await readLimitedResponse(response);
  const metadata = await sharp(buffer, { animated: true }).metadata();

  if (!metadata.width || !metadata.height) {
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
    height: metadata.pageHeight ?? metadata.height,
    format: metadata.format,
    sizeBytes: buffer.byteLength,
    suggestedBaseName: sanitizeBaseName(rawName),
  };
}

async function readLimitedResponse(response: Response): Promise<Buffer> {
  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_SOURCE_BYTES) {
      throw new RangeError(
        `Image exceeds ${formatBytes(MAX_SOURCE_BYTES)} limit`,
      );
    }
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new RangeError(
        `Image exceeds ${formatBytes(MAX_SOURCE_BYTES)} limit`,
      );
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, totalBytes);
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
        rel:
          size === 180 ? "apple-touch-icon" : size <= 64 ? "icon" : undefined,
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
        {
          size: 180,
          filename: "apple-touch-icon.png",
          rel: "apple-touch-icon",
        },
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
        {
          size: 180,
          filename: "apple-touch-icon.png",
          rel: "apple-touch-icon",
        },
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
    throw new Error(
      "Manifest options are required when manifest generation is enabled",
    );
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

export function summarizePlan(
  source: LoadedImageSource,
  plan: CliGenerationPlan,
): string {
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
  validateGenerationPlan(plan);
  await mkdir(plan.outputDir, { recursive: true });
  const pending: {
    artifact: GeneratedArtifact;
    contents: Buffer | string;
  }[] = [];
  const pngCache = new Map<number, Promise<Buffer>>();
  const getPng = (size: number): Promise<Buffer> => {
    const cached = pngCache.get(size);
    if (cached) return cached;
    const rendered = renderPng(source.buffer, size, plan.fit, plan.background);
    pngCache.set(size, rendered);
    return rendered;
  };

  for (const output of plan.pngOutputs) {
    const outputPath = join(plan.outputDir, output.filename);
    pending.push({
      artifact: { type: "png", filePath: outputPath },
      contents: await getPng(output.size),
    });
  }

  if (plan.icoSizes.length > 0) {
    const icoImages = await Promise.all(plan.icoSizes.map(getPng));
    const icoBuffer = await pngToIco(icoImages);
    const icoPath = join(plan.outputDir, `${plan.baseName}.ico`);
    pending.push({
      artifact: { type: "ico", filePath: icoPath },
      contents: icoBuffer,
    });
  }

  if (plan.htmlSnippet) {
    const htmlPath = join(plan.outputDir, `${plan.baseName}.html`);
    pending.push({
      artifact: { type: "html", filePath: htmlPath },
      contents: renderHtmlSnippet(plan),
    });
  }

  if (plan.manifest) {
    const manifestPath = join(plan.outputDir, plan.manifestFilename);
    pending.push({
      artifact: { type: "manifest", filePath: manifestPath },
      contents: renderManifest(plan),
    });
  }

  await commitArtifacts(pending, plan.outputDir, plan.overwrite);
  return pending.map(({ artifact }) => artifact);
}

function validateGenerationPlan(plan: CliGenerationPlan): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(plan.baseName)) {
    throw new Error("Base name contains unsafe characters");
  }
  const filenames = new Set<string>();
  const addFilename = (filename: string): void => {
    const normalized = filename.toLowerCase();
    if (filenames.has(normalized)) {
      throw new Error(`Duplicate output filename: ${filename}`);
    }
    filenames.add(normalized);
  };

  if (
    plan.icoSizes.some(
      (size) => !Number.isInteger(size) || size <= 0 || size > 256,
    )
  ) {
    throw new RangeError("ICO size must be an integer between 1 and 256");
  }
  if (new Set(plan.icoSizes).size !== plan.icoSizes.length) {
    throw new Error("ICO sizes must not contain duplicates");
  }

  for (const output of plan.pngOutputs) {
    validateOutput(output.filename, output.size, ".png");
    addFilename(output.filename);
  }
  if (
    basename(plan.manifestFilename) !== plan.manifestFilename ||
    /[\\/]/.test(plan.manifestFilename) ||
    !/^[a-z0-9][a-z0-9._-]*$/i.test(plan.manifestFilename)
  ) {
    throw new Error("Manifest filename must not contain a path");
  }
  if (plan.icoSizes.length > 0) addFilename(`${plan.baseName}.ico`);
  if (plan.htmlSnippet) addFilename(`${plan.baseName}.html`);
  if (plan.manifest) addFilename(plan.manifestFilename);
}

function validateOutput(
  filename: string,
  size: number,
  extension: string,
): void {
  if (
    basename(filename) !== filename ||
    /[\\/]/.test(filename) ||
    !/^[a-z0-9][a-z0-9._-]*$/i.test(filename) ||
    !filename.toLowerCase().endsWith(extension)
  ) {
    throw new Error(
      `Unsafe ${extension.slice(1).toUpperCase()} filename: ${filename}`,
    );
  }
  if (!Number.isInteger(size) || size <= 0 || size > 1024) {
    throw new RangeError("Output size must be an integer between 1 and 1024");
  }
}

async function renderPng(
  input: Buffer,
  size: number,
  fit: FitMode,
  background: string,
): Promise<Buffer> {
  return sharp(input, { animated: false, page: 0, pages: 1 })
    .rotate()
    .resize(size, size, {
      fit,
      background,
    })
    .png()
    .toBuffer();
}

async function commitArtifacts(
  pending: {
    artifact: GeneratedArtifact;
    contents: Buffer | string;
  }[],
  outputDir: string,
  overwrite: boolean,
): Promise<void> {
  if (!overwrite) {
    for (const { artifact } of pending) {
      try {
        await lstat(artifact.filePath);
        throw new Error(
          `Refusing to overwrite existing file: ${artifact.filePath}`,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          continue;
        }
        throw error;
      }
    }
  }

  const transactionDir = join(outputDir, `.favium-${randomUUID()}`);
  const stagedDir = join(transactionDir, "staged");
  const backupDir = join(transactionDir, "backup");
  const committed: string[] = [];
  const backups: { backupPath: string; filePath: string }[] = [];

  try {
    await mkdir(stagedDir, { recursive: true });
    await mkdir(backupDir);

    for (const { artifact, contents } of pending) {
      const stagedPath = join(stagedDir, basename(artifact.filePath));
      await writeFile(stagedPath, contents, { flag: "wx" });
    }

    for (const { artifact } of pending) {
      const filePath = artifact.filePath;
      const filename = basename(filePath);
      const stagedPath = join(stagedDir, filename);

      if (overwrite) {
        try {
          await lstat(filePath);
          const backupPath = join(backupDir, filename);
          await rename(filePath, backupPath);
          backups.push({ backupPath, filePath });
        } catch (error) {
          if (
            !(error instanceof Error) ||
            !("code" in error) ||
            error.code !== "ENOENT"
          ) {
            throw error;
          }
        }
        await rename(stagedPath, filePath);
      } else {
        await copyFile(stagedPath, filePath, fsConstants.COPYFILE_EXCL);
      }
      committed.push(filePath);
    }
  } catch (error) {
    for (const filePath of committed.reverse()) {
      await rm(filePath, { force: true, recursive: true }).catch(
        () => undefined,
      );
    }
    for (const { backupPath, filePath } of backups.reverse()) {
      await rename(backupPath, filePath).catch(() => undefined);
    }
    if (
      !overwrite &&
      error instanceof Error &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      throw new Error("Output changed during generation; transaction aborted");
    }
    throw error;
  } finally {
    await rm(transactionDir, { recursive: true, force: true });
  }
}
