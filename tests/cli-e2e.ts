import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import sharp from "sharp";

const execFileAsync = promisify(execFile);
const directory = await mkdtemp(join(tmpdir(), "favium-cli-e2e-"));

function isExecError(
  error: unknown,
): error is Error & { code: number; stderr: string } {
  return (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "number" &&
    "stderr" in error &&
    typeof error.stderr === "string"
  );
}

try {
  const sourcePath = join(directory, "source.webp");
  const outputDir = join(directory, "output");
  await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: "#2563eb",
    },
  })
    .webp()
    .toFile(sourcePath);

  const { stdout } = await execFileAsync(
    process.execPath,
    [
      "cli/dist/cli.js",
      "--source",
      sourcePath,
      "--output",
      outputDir,
      "--preset",
      "default",
      "--yes",
    ],
    { cwd: process.cwd() },
  );

  assert.match(stdout, /9 file\(s\) created/);
  const pngMeta = await sharp(join(outputDir, "favicon-32x32.png")).metadata();
  assert.equal(pngMeta.format, "png");
  assert.equal(pngMeta.width, 32);
  assert.equal(pngMeta.height, 32);

  const ico = await readFile(join(outputDir, "source.ico"));
  assert.deepEqual([...ico.subarray(0, 6)], [0, 0, 1, 0, 3, 0]);
  const manifest: unknown = JSON.parse(
    await readFile(join(outputDir, "manifest.webmanifest"), "utf8"),
  );
  assert(
    typeof manifest === "object" &&
      manifest !== null &&
      "icons" in manifest &&
      Array.isArray(manifest.icons),
  );
  assert.equal(manifest.icons.length, 2);

  const version = await execFileAsync(process.execPath, [
    "cli/dist/cli.js",
    "--version",
  ]);
  assert.match(version.stdout, /^favium 0\.2\.0/);

  await assert.rejects(
    execFileAsync(process.execPath, ["cli/dist/cli.js", "--unknown"]),
    (error: unknown) =>
      isExecError(error) &&
      error.code === 1 &&
      error.stderr.includes("Unknown option"),
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
