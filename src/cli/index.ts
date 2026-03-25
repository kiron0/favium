import {
  confirm,
  intro,
  isCancel,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import type { Option } from "@clack/prompts";
import { readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import {
  collectImagesFromDirectory,
  generateArtifacts,
  getPresetBlueprint,
  getSuggestedOutputDirectory,
  isExternalImageUrl,
  loadImageFromPath,
  loadImageFromUrl,
  parseSizeList,
  sanitizeBaseName,
  summarizePlan,
  type CliGenerationPlan,
  type CliPreset,
  type FitMode,
  type LoadedImageSource,
  type ManifestOptions,
} from "./core";

interface CliArgs {
  help: boolean;
  output?: string;
  preset?: CliPreset;
  recursive: boolean;
  source?: string;
  version: boolean;
  yes: boolean;
}

let hasExitedGracefully = false;
const packageVersion = getPackageVersion();

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.version) {
    console.log(`favium ${packageVersion}`);
    return;
  }

  intro("Favium CLI");

  try {
    const source = await resolveSource(args);
    note(
      [
        `Source: ${source.label}`,
        `Image: ${source.width}x${source.height}`,
        `Format: ${source.format}`,
      ].join("\n"),
      "Selected image",
    );

    const outputDir = await resolveOutputDirectory(source, args);
    const baseName = await resolveBaseName(source, args.yes);
    const preset = await resolvePreset(args);
    const fit = await resolveFitMode(args.yes);
    const background =
      fit === "contain"
        ? await promptText("Background color for padding", "#ffffff")
        : "#000000";
    const overwrite = args.yes
      ? true
      : await promptConfirm("Overwrite existing files if needed?", false);
    const blueprint = await resolveBlueprint(baseName, preset);
    const htmlSnippet = args.yes
      ? blueprint.htmlSnippet
      : await promptConfirm(
          "Generate an HTML snippet file?",
          blueprint.htmlSnippet,
        );
    const manifest = args.yes
      ? blueprint.manifest
      : await promptConfirm(
          "Generate a web manifest file when relevant sizes exist?",
          blueprint.manifest,
        );

    const plan: CliGenerationPlan = {
      baseName,
      outputDir,
      fit,
      background,
      overwrite,
      icoSizes: blueprint.icoSizes,
      pngOutputs: blueprint.pngOutputs,
      htmlSnippet,
      manifest,
      manifestFilename: blueprint.manifestFilename,
      manifestOptions: manifest
        ? await resolveManifestOptions(baseName, args.yes)
        : undefined,
    };

    note(summarizePlan(source, plan), "Plan");

    if (!args.yes) {
      const approved = await promptConfirm("Generate these assets now?", true);
      if (!approved) {
        exitGracefully();
      }
    }

    const progress = spinner();
    progress.start("Generating favicon assets");
    const artifacts = await generateArtifacts(source, plan);
    progress.stop("Assets generated");

    note(
      artifacts
        .map((artifact) => `- ${artifact.type}: ${artifact.filePath}`)
        .join("\n"),
      "Written files",
    );
    outro(`Done. ${artifacts.length} file(s) created.`);
  } catch (error) {
    outro(error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    help: false,
    recursive: false,
    version: false,
    yes: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") args.help = true;
    if (arg === "--version" || arg === "-v") args.version = true;
    if (arg === "--recursive") args.recursive = true;
    if (arg === "--yes" || arg === "-y") args.yes = true;
    if (arg === "--source") args.source = argv[++index];
    if (arg === "--output") args.output = argv[++index];
    if (arg === "--preset") args.preset = argv[++index] as CliPreset;
  }

  return args;
}

function getPackageVersion(): string {
  try {
    const packageJsonPath = resolve(__dirname, "..", "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      version?: string;
    };

    return packageJson.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function resolveSource(args: CliArgs): Promise<LoadedImageSource> {
  if (args.source) {
    return resolveExplicitSource(args.source, args.recursive);
  }

  while (true) {
    const sourceMode = await promptSelect(
      "Where should the source image come from?",
      [
        { label: "Pick from current directory", value: "current-dir" },
        { label: "Use a custom local path", value: "custom-path" },
        { label: "Use an external image URL", value: "external-url" },
      ],
    );

    try {
      if (sourceMode === "current-dir") {
        const recursive = await promptConfirm(
          "Scan subdirectories too?",
          false,
        );
        const files = await collectImagesFromDirectory(
          process.cwd(),
          recursive,
        );

        if (files.length === 0) {
          note(
            "No valid image files were found in the current directory. Try another source.",
            "No images found",
          );
          continue;
        }

        const selected = await promptSelect(
          "Select an image file",
          files.map((filePath) => ({
            label: filePath.replace(`${process.cwd()}/`, ""),
            value: filePath,
          })),
        );

        const source = await loadImageFromPath(selected);
        source.kind = "current-dir";
        return source;
      }

      if (sourceMode === "custom-path") {
        return promptLocalImageSource();
      }

      return promptExternalImageSource();
    } catch (error) {
      note(
        error instanceof Error
          ? error.message
          : "Failed to resolve the selected source.",
        "Source rejected",
      );
    }
  }
}

async function resolveExplicitSource(
  sourceValue: string,
  recursive: boolean,
): Promise<LoadedImageSource> {
  if (isExternalImageUrl(sourceValue)) {
    return loadImageFromUrl(sourceValue);
  }

  const absolutePath = resolve(sourceValue);
  const details = await stat(absolutePath);

  if (details.isDirectory()) {
    const files = await collectImagesFromDirectory(absolutePath, recursive);
    if (files.length === 0) {
      throw new Error(
        `No valid image files found in directory: ${absolutePath}`,
      );
    }

    const selected = await promptSelect(
      "Select an image file",
      files.map((filePath) => ({
        label: filePath.replace(`${absolutePath}/`, ""),
        value: filePath,
      })),
    );

    return loadImageFromPath(selected);
  }

  return loadImageFromPath(absolutePath);
}

async function resolveOutputDirectory(
  source: LoadedImageSource,
  args: CliArgs,
): Promise<string> {
  if (args.output) {
    return resolve(args.output);
  }

  const suggestedDirectory = getSuggestedOutputDirectory(source);

  if (args.yes) {
    return suggestedDirectory;
  }

  const options = [
    {
      label: `Create "${source.suggestedBaseName}" directory (Recommended)`,
      value: suggestedDirectory,
    },
    { label: "Current working directory", value: process.cwd() },
  ];

  if (source.directory) {
    options.push({
      label: `Same directory as source (${source.directory})`,
      value: source.directory,
    });
  }

  options.push({ label: "Custom directory", value: "__custom__" });

  const selection = await promptSelect(
    "Where should the generated files be written?",
    options,
  );

  if (selection === "__custom__") {
    return resolve(await promptText("Enter output directory", process.cwd()));
  }

  return resolve(selection);
}

async function resolveBaseName(
  source: LoadedImageSource,
  yes: boolean,
): Promise<string> {
  if (yes) {
    return sanitizeBaseName(source.suggestedBaseName);
  }

  return sanitizeBaseName(
    await promptText(
      "Base filename for generated assets",
      source.suggestedBaseName,
    ),
  );
}

async function resolvePreset(args: CliArgs): Promise<CliPreset> {
  if (args.preset) {
    return args.preset;
  }

  return promptSelect("Choose an output preset", [
    { label: "Default favicon set", value: "default" },
    { label: "Rich web app set", value: "web-app" },
    { label: "Apple + Android essentials", value: "apple-android" },
    { label: "Custom size set", value: "custom" },
  ]);
}

async function resolveFitMode(yes: boolean): Promise<FitMode> {
  if (yes) return "cover";

  return promptSelect("How should images be fit into square outputs?", [
    { label: "Cover and crop to fill the square", value: "cover" },
    { label: "Contain and pad the square", value: "contain" },
  ]);
}

async function resolveBlueprint(baseName: string, preset: CliPreset) {
  if (preset !== "custom") {
    return getPresetBlueprint(preset, baseName);
  }

  while (true) {
    const defaultPngSizes = await promptText(
      "PNG sizes (comma-separated)",
      "16,32,64,128,180,192,256,512",
    );
    const defaultIcoSizes = await promptText(
      "ICO sizes (comma-separated, max 256)",
      "16,32,48,64,256",
    );

    const pngSizes = parseSizeList(defaultPngSizes);
    const icoSizes = parseSizeList(defaultIcoSizes).filter(
      (size) => size <= 256,
    );

    if (pngSizes.length === 0) {
      note(
        "At least one valid PNG size must be provided.",
        "Invalid PNG sizes",
      );
      continue;
    }

    return getPresetBlueprint("custom", baseName, pngSizes, icoSizes);
  }
}

async function resolveManifestOptions(
  baseName: string,
  yes: boolean,
): Promise<ManifestOptions> {
  if (yes) {
    return {
      name: baseName,
      shortName: baseName,
      backgroundColor: "#ffffff",
      themeColor: "#111827",
      display: "standalone",
      startUrl: "/",
    };
  }

  const name = await promptText("Manifest app name", baseName);
  const shortName = await promptText("Manifest short name", name);
  const themeColor = await promptText("Theme color", "#111827");
  const backgroundColor = await promptText("Background color", "#ffffff");
  const startUrl = await promptText("Start URL", "/");
  const display = await promptSelect<ManifestOptions["display"]>(
    "Display mode",
    [
      { label: "Standalone", value: "standalone" },
      { label: "Minimal UI", value: "minimal-ui" },
      { label: "Fullscreen", value: "fullscreen" },
      { label: "Browser", value: "browser" },
    ],
  );

  return {
    name,
    shortName,
    backgroundColor,
    themeColor,
    display,
    startUrl,
  };
}

async function promptExternalImageSource(): Promise<LoadedImageSource> {
  while (true) {
    const url = await promptText("Enter an image URL", "https://");

    if (!isExternalImageUrl(url)) {
      note("Please enter a valid http or https image URL.", "Invalid URL");
      continue;
    }

    try {
      return await loadImageFromUrl(url);
    } catch (error) {
      note(
        error instanceof Error
          ? error.message
          : "Failed to load the image URL.",
        "URL rejected",
      );
    }
  }
}

async function promptLocalImageSource(): Promise<LoadedImageSource> {
  while (true) {
    const inputPath = await promptText(
      "Enter a file or directory path",
      process.cwd(),
    );

    try {
      return await resolveExplicitSource(inputPath, true);
    } catch (error) {
      note(
        error instanceof Error
          ? error.message
          : "Failed to resolve the local image path.",
        "Path rejected",
      );
    }
  }
}

async function promptText(
  message: string,
  initialValue: string,
): Promise<string> {
  return unwrapPrompt(
    await text({
      message,
      initialValue,
    }),
  );
}

async function promptConfirm(
  message: string,
  initialValue: boolean,
): Promise<boolean> {
  return unwrapPrompt(
    await confirm({
      message,
      initialValue,
    }),
  );
}

async function promptSelect<T extends string>(
  message: string,
  options: Array<Option<T>>,
): Promise<T> {
  return unwrapPrompt(
    await select({
      message,
      options,
    }),
  );
}

function unwrapPrompt<T>(value: T | symbol): T {
  if (isCancel(value)) {
    exitGracefully();
  }

  return value;
}

function exitGracefully(): never {
  if (!hasExitedGracefully) {
    hasExitedGracefully = true;
    process.stdout.write("Thanks for using favium\n");
  }

  process.exit(0);
}

function printHelp(): void {
  console.log(`favium

Interactive favicon generator for terminal workflows.

Usage:
  favium
  favium --source ./logo.png --output ./public --preset web-app --yes

Options:
  -h, --help       Show this help message
  -v, --version    Show the current version
  --source         Local file, local directory, or external image URL
  --output         Output directory
  --preset         default | web-app | apple-android | custom
  --recursive      Recursively scan directories for valid images
  -y, --yes        Accept defaults for optional prompts
`);
}

void main();

process.on("SIGINT", () => {
  exitGracefully();
});
