import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  collectImagesFromDirectory,
  formatBytes,
  generateArtifacts,
  getPresetBlueprint,
  getSuggestedOutputDirectory,
  isSupportedImagePath,
  loadImageFromPath,
  loadImageFromUrl,
  MAX_SOURCE_BYTES,
  parseSizeList,
  renderHtmlSnippet,
  renderManifest,
  sanitizeBaseName,
  summarizePlan,
  type CliGenerationPlan,
  type LoadedImageSource,
} from "../src/cli/core.ts";

describe("cli-core", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("collects valid images from a directory", async () => {
    const directory = await mkdtemp(join(tmpdir(), "favium-images-"));
    await createImage(join(directory, "logo.png"), "png");
    await createImage(join(directory, "photo.jpg"), "jpeg");
    await writeFile(join(directory, "notes.txt"), "ignore");

    const files = await collectImagesFromDirectory(directory);

    expect(files.map((filePath) => filePath.split("/").pop())).toEqual([
      "logo.png",
      "photo.jpg",
    ]);
  });

  it("only collects nested images when recursive scanning is enabled", async () => {
    const directory = await mkdtemp(join(tmpdir(), "favium-images-recursive-"));
    const nestedDirectory = join(directory, "nested");
    await writeFile(join(directory, "ignore.txt"), "ignore");
    await createImage(join(directory, "root.png"), "png");
    await createNestedImage(nestedDirectory, "deep.webp");

    const shallowFiles = await collectImagesFromDirectory(directory, false);
    const recursiveFiles = await collectImagesFromDirectory(directory, true);

    expect(shallowFiles.map((filePath) => filePath.split("/").pop())).toEqual([
      "root.png",
    ]);
    expect(recursiveFiles.map((filePath) => filePath.split("/").pop())).toEqual(
      ["deep.webp", "root.png"],
    );
  });

  it("parses, deduplicates, and sorts size input", () => {
    expect(parseSizeList("64, 32, 64, 16, abc")).toEqual([16, 32, 64]);
  });

  it("drops invalid sizes outside the supported range", () => {
    expect(parseSizeList("0, -10, 24, 2048, 1024")).toEqual([24, 1024]);
  });

  it("recognizes supported image extensions case-insensitively", () => {
    expect(isSupportedImagePath("/tmp/logo.PNG")).toBe(true);
    expect(isSupportedImagePath("/tmp/logo.webp")).toBe(true);
    expect(isSupportedImagePath("/tmp/logo.txt")).toBe(false);
  });

  it("sanitizes base names into filesystem-friendly names", () => {
    expect(sanitizeBaseName("  NRB Logo Oct 25  ")).toBe("nrb-logo-oct-25");
    expect(sanitizeBaseName("###")).toBe("favicon");
  });

  it("creates preset blueprints with useful defaults", () => {
    const blueprint = getPresetBlueprint("default", "favicon");

    expect(blueprint.icoSizes).toEqual([16, 32, 48]);
    expect(blueprint.pngOutputs.map((output) => output.filename)).toContain(
      "apple-touch-icon.png",
    );
    expect(blueprint.manifest).toBe(true);
  });

  it("creates custom blueprints without manifest when no manifest sizes are present", () => {
    const blueprint = getPresetBlueprint("custom", "logo", [32, 180], [16, 32]);

    expect(blueprint.icoSizes).toEqual([16, 32]);
    expect(blueprint.manifest).toBe(false);
    expect(blueprint.pngOutputs).toEqual([
      { size: 32, filename: "logo-32x32.png", rel: "icon", manifest: false },
      {
        size: 180,
        filename: "logo-180x180.png",
        rel: "apple-touch-icon",
        manifest: false,
      },
    ]);
  });

  it("renders html and manifest snippets", () => {
    const plan: CliGenerationPlan = {
      baseName: "favicon",
      outputDir: "/tmp",
      fit: "cover",
      background: "#ffffff",
      overwrite: true,
      icoSizes: [16, 32, 48],
      pngOutputs: [
        { size: 32, filename: "favicon-32x32.png", rel: "icon" },
        {
          size: 180,
          filename: "apple-touch-icon.png",
          rel: "apple-touch-icon",
        },
        { size: 192, filename: "android-chrome-192x192.png", manifest: true },
      ],
      htmlSnippet: true,
      manifest: true,
      manifestFilename: "manifest.webmanifest",
      manifestOptions: {
        name: "Favium",
        shortName: "Favium",
        backgroundColor: "#ffffff",
        themeColor: "#111827",
        display: "standalone",
        startUrl: "/",
      },
    };

    expect(renderHtmlSnippet(plan)).toContain('rel="manifest"');
    expect(renderManifest(plan)).toContain('"./android-chrome-192x192.png"');
  });

  it("throws when manifest generation is requested without manifest options", () => {
    const plan: CliGenerationPlan = {
      baseName: "favicon",
      outputDir: "/tmp",
      fit: "cover",
      background: "#ffffff",
      overwrite: true,
      icoSizes: [],
      pngOutputs: [],
      htmlSnippet: false,
      manifest: true,
      manifestFilename: "manifest.webmanifest",
    };

    expect(() => renderManifest(plan)).toThrow(
      "Manifest options are required when manifest generation is enabled",
    );
  });

  it("suggests a same-name output directory beside the source file", () => {
    const source: LoadedImageSource = {
      kind: "custom-path",
      label: "logo.png",
      origin: "/tmp/brand/logo.png",
      buffer: Buffer.alloc(0),
      width: 256,
      height: 256,
      format: "png",
      sizeBytes: 0,
      suggestedBaseName: "logo",
      directory: "/tmp/brand",
    };

    expect(getSuggestedOutputDirectory(source)).toBe("/tmp/brand/logo");
  });

  it("formats byte sizes and plan summaries for interactive review", () => {
    const source: LoadedImageSource = {
      kind: "external-url",
      label: "https://example.com/logo.png",
      origin: "https://example.com/logo.png",
      buffer: Buffer.alloc(2048),
      width: 512,
      height: 512,
      format: "png",
      sizeBytes: 2048,
      suggestedBaseName: "logo",
    };
    const plan: CliGenerationPlan = {
      baseName: "logo",
      outputDir: "/tmp/logo",
      fit: "contain",
      background: "#ffffff",
      overwrite: true,
      icoSizes: [16, 32],
      pngOutputs: [
        { size: 192, filename: "android-chrome-192x192.png", manifest: true },
      ],
      htmlSnippet: true,
      manifest: true,
      manifestFilename: "manifest.webmanifest",
      manifestOptions: {
        name: "Logo",
        shortName: "Logo",
        backgroundColor: "#ffffff",
        themeColor: "#111827",
        display: "standalone",
        startUrl: "/",
      },
    };

    expect(formatBytes(999)).toBe("999 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(1024 * 1024 * 3)).toBe("3.0 MB");
    expect(summarizePlan(source, plan)).toContain("Fit: contain on #ffffff");
    expect(summarizePlan(source, plan)).toContain(
      "Image: 512x512 PNG (2.0 KB)",
    );
  });

  it("loads local images and derives a sanitized base name", async () => {
    const directory = await mkdtemp(join(tmpdir(), "favium-local-image-"));
    const filePath = join(directory, "NRB Logo Oct 25.png");
    await createImage(filePath, "png");

    const source = await loadImageFromPath(filePath);

    expect(source.origin).toBe(filePath);
    expect(source.width).toBe(16);
    expect(source.format).toBe("png");
    expect(source.suggestedBaseName).toBe("nrb-logo-oct-25");
    expect(source.directory).toBe(directory);
  });

  it("loads WebP sources", async () => {
    const directory = await mkdtemp(join(tmpdir(), "favium-webp-source-"));
    const filePath = join(directory, "logo.webp");
    await createImage(filePath, "webp");

    const source = await loadImageFromPath(filePath);

    expect(source.format).toBe("webp");
    expect(source.width).toBe(16);
  });

  it("rejects oversized local inputs before reading", async () => {
    const directory = await mkdtemp(join(tmpdir(), "favium-large-source-"));
    const filePath = join(directory, "large.png");
    await writeFile(filePath, Buffer.alloc(MAX_SOURCE_BYTES + 1));

    await expect(loadImageFromPath(filePath)).rejects.toThrow("25.0 MB limit");
  });

  it("loads external images from URLs", async () => {
    const imageBuffer = await createImageBuffer("png", 24);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(imageBuffer, {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );

    const source = await loadImageFromUrl(
      "https://example.com/assets/Logo%20Mark.png",
    );

    expect(source.kind).toBe("external-url");
    expect(source.width).toBe(24);
    expect(source.format).toBe("png");
    expect(source.suggestedBaseName).toBe("logo-20mark");
  });

  it("rejects URL sources that return non-image content", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>nope</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    await expect(loadImageFromUrl("https://example.com/")).rejects.toThrow(
      "URL did not return an image. Received content-type: text/html",
    );
  });

  it("rejects spoofed image content types", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not an image", {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );

    await expect(
      loadImageFromUrl("https://example.com/fake.png"),
    ).rejects.toThrow();
  });

  it("rejects URL sources when the fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("missing", {
        status: 404,
        statusText: "Not Found",
      }),
    );

    await expect(
      loadImageFromUrl("https://example.com/missing.png"),
    ).rejects.toThrow("Failed to fetch image: 404 Not Found");
  });

  it("rejects oversized remote inputs from headers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("x", {
        status: 200,
        headers: {
          "content-type": "image/png",
          "content-length": String(MAX_SOURCE_BYTES + 1),
        },
      }),
    );

    await expect(
      loadImageFromUrl("https://example.com/large.png"),
    ).rejects.toThrow("25.0 MB limit");
  });

  it("rejects oversized streamed inputs without a content-length", async () => {
    const oversized = new Uint8Array(MAX_SOURCE_BYTES + 1);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(oversized);
            controller.close();
          },
        }),
        { headers: { "content-type": "image/png" } },
      ),
    );

    await expect(
      loadImageFromUrl("https://example.com/stream.png"),
    ).rejects.toThrow("25.0 MB limit");
  });

  it("generates favicon assets end-to-end", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "favium-out-"));
    const sourceBuffer = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: "#2563eb",
      },
    })
      .webp()
      .toBuffer();

    const source: LoadedImageSource = {
      kind: "custom-path",
      label: "logo.webp",
      origin: "/tmp/logo.webp",
      buffer: sourceBuffer,
      width: 256,
      height: 256,
      format: "webp",
      sizeBytes: sourceBuffer.byteLength,
      suggestedBaseName: "logo",
      directory: outputDir,
    };

    const plan: CliGenerationPlan = {
      baseName: "favicon",
      outputDir,
      fit: "cover",
      background: "#ffffff",
      overwrite: true,
      icoSizes: [16, 32],
      pngOutputs: [
        { size: 32, filename: "favicon-32x32.png", rel: "icon" },
        { size: 192, filename: "android-chrome-192x192.png", manifest: true },
      ],
      htmlSnippet: true,
      manifest: true,
      manifestFilename: "manifest.webmanifest",
      manifestOptions: {
        name: "Favium",
        shortName: "Favium",
        backgroundColor: "#ffffff",
        themeColor: "#111827",
        display: "standalone",
        startUrl: "/",
      },
    };

    const artifacts = await generateArtifacts(source, plan);

    expect(artifacts).toHaveLength(5);
    expect(await readFile(join(outputDir, "favicon.ico"))).toBeInstanceOf(
      Buffer,
    );
    expect(await readFile(join(outputDir, "favicon.html"), "utf8")).toContain(
      "manifest.webmanifest",
    );
    expect(
      await sharp(join(outputDir, "favicon-32x32.png")).metadata(),
    ).toMatchObject({ format: "png", width: 32, height: 32 });
  });

  it("refuses to overwrite existing files when overwrite is disabled", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "favium-overwrite-"));
    const sourceBuffer = await createImageBuffer("png", 64);
    const source: LoadedImageSource = {
      kind: "custom-path",
      label: "logo.png",
      origin: "/tmp/logo.png",
      buffer: sourceBuffer,
      width: 64,
      height: 64,
      format: "png",
      sizeBytes: sourceBuffer.byteLength,
      suggestedBaseName: "logo",
      directory: outputDir,
    };
    const plan: CliGenerationPlan = {
      baseName: "favicon",
      outputDir,
      fit: "cover",
      background: "#ffffff",
      overwrite: false,
      icoSizes: [],
      pngOutputs: [{ size: 32, filename: "favicon-32x32.png", rel: "icon" }],
      htmlSnippet: false,
      manifest: false,
      manifestFilename: "manifest.webmanifest",
    };

    await writeFile(join(outputDir, "favicon-32x32.png"), "already here");

    await expect(generateArtifacts(source, plan)).rejects.toThrow(
      `Refusing to overwrite existing file: ${join(outputDir, "favicon-32x32.png")}`,
    );
  });

  it("replaces output symlinks without modifying their targets", async () => {
    const directory = await mkdtemp(join(tmpdir(), "favium-symlink-"));
    const outputDir = join(directory, "output");
    await mkdir(outputDir);
    const targetPath = join(directory, "sensitive.txt");
    const outputPath = join(outputDir, "icon.png");
    await writeFile(targetPath, "do not overwrite");
    await symlink(targetPath, outputPath);
    const sourceBuffer = await createImageBuffer("png");

    await generateArtifacts(
      {
        kind: "custom-path",
        label: "logo.png",
        origin: "/tmp/logo.png",
        buffer: sourceBuffer,
        width: 16,
        height: 16,
        format: "png",
        sizeBytes: sourceBuffer.byteLength,
        suggestedBaseName: "logo",
      },
      {
        baseName: "favicon",
        outputDir,
        fit: "cover",
        background: "#fff",
        overwrite: true,
        icoSizes: [],
        pngOutputs: [{ size: 16, filename: "icon.png" }],
        htmlSnippet: false,
        manifest: false,
        manifestFilename: "manifest.webmanifest",
      },
    );

    expect(await readFile(targetPath, "utf8")).toBe("do not overwrite");
    expect((await sharp(outputPath).metadata()).format).toBe("png");
  });

  it.each(["../escape.png", "nested/escape.png", "nested\\escape.png"])(
    "rejects unsafe output filename %s",
    async (filename) => {
      const outputDir = await mkdtemp(join(tmpdir(), "favium-unsafe-output-"));
      const sourceBuffer = await createImageBuffer("png");
      const plan: CliGenerationPlan = {
        baseName: "favicon",
        outputDir,
        fit: "cover",
        background: "#fff",
        overwrite: true,
        icoSizes: [],
        pngOutputs: [{ size: 16, filename }],
        htmlSnippet: false,
        manifest: false,
        manifestFilename: "manifest.webmanifest",
      };

      await expect(
        generateArtifacts(
          {
            kind: "custom-path",
            label: "logo.png",
            origin: "/tmp/logo.png",
            buffer: sourceBuffer,
            width: 16,
            height: 16,
            format: "png",
            sizeBytes: sourceBuffer.byteLength,
            suggestedBaseName: "logo",
          },
          plan,
        ),
      ).rejects.toThrow("Unsafe PNG filename");
    },
  );

  it("rejects duplicate output filenames", async () => {
    const sourceBuffer = await createImageBuffer("png");
    const plan: CliGenerationPlan = {
      baseName: "favicon",
      outputDir: "/tmp",
      fit: "cover",
      background: "#fff",
      overwrite: true,
      icoSizes: [],
      pngOutputs: [
        { size: 16, filename: "same.png" },
        { size: 32, filename: "SAME.png" },
      ],
      htmlSnippet: false,
      manifest: false,
      manifestFilename: "manifest.webmanifest",
    };

    await expect(
      generateArtifacts(
        {
          kind: "custom-path",
          label: "logo.png",
          origin: "/tmp/logo.png",
          buffer: sourceBuffer,
          width: 16,
          height: 16,
          format: "png",
          sizeBytes: sourceBuffer.byteLength,
          suggestedBaseName: "logo",
        },
        plan,
      ),
    ).rejects.toThrow("Duplicate output filename");
  });

  it.each([
    {
      label: "HTML-injecting filename",
      patch: { pngOutputs: [{ size: 16, filename: 'x"onload=.png' }] },
      message: "Unsafe PNG filename",
    },
    {
      label: "manifest traversal",
      patch: { manifestFilename: "../manifest.webmanifest" },
      message: "Manifest filename must not contain a path",
    },
    {
      label: "invalid ICO size",
      patch: { icoSizes: [257] },
      message: "ICO size must be an integer between 1 and 256",
    },
    {
      label: "duplicate ICO size",
      patch: { icoSizes: [16, 16] },
      message: "ICO sizes must not contain duplicates",
    },
    {
      label: "unsafe base name",
      patch: { baseName: "../favicon" },
      message: "Base name contains unsafe characters",
    },
    {
      label: "oversized output",
      patch: { pngOutputs: [{ size: 1025, filename: "large.png" }] },
      message: "Output size must be an integer between 1 and 1024",
    },
  ])("rejects $label", async ({ patch, message }) => {
    const sourceBuffer = await createImageBuffer("png");
    const plan: CliGenerationPlan = {
      baseName: "favicon",
      outputDir: "/tmp",
      fit: "cover",
      background: "#fff",
      overwrite: true,
      icoSizes: [],
      pngOutputs: [],
      htmlSnippet: false,
      manifest: false,
      manifestFilename: "manifest.webmanifest",
      ...patch,
    };

    await expect(
      generateArtifacts(
        {
          kind: "custom-path",
          label: "logo.png",
          origin: "/tmp/logo.png",
          buffer: sourceBuffer,
          width: 16,
          height: 16,
          format: "png",
          sizeBytes: sourceBuffer.byteLength,
          suggestedBaseName: "logo",
        },
        plan,
      ),
    ).rejects.toThrow(message);
  });
});

async function createImage(
  filePath: string,
  format: "png" | "jpeg" | "webp",
): Promise<void> {
  const buffer = await createImageBuffer(format);
  await writeFile(filePath, buffer);
}

async function createImageBuffer(
  format: "png" | "jpeg" | "webp",
  size = 16,
): Promise<Buffer> {
  const image = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#dc2626",
    },
  });

  if (format === "jpeg") {
    return image.jpeg().toBuffer();
  }

  if (format === "webp") {
    return image.webp().toBuffer();
  }

  return image.png().toBuffer();
}

async function createNestedImage(
  directory: string,
  filename: string,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  await createImage(join(directory, filename), "webp");
}
