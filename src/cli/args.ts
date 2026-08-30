import type { CliPreset } from "./core";

export interface CliArgs {
  help: boolean;
  output?: string;
  preset?: CliPreset;
  recursive: boolean;
  source?: string;
  version: boolean;
  yes: boolean;
}

const PRESETS = new Set<CliPreset>([
  "default",
  "web-app",
  "apple-android",
  "custom",
]);

export function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    help: false,
    recursive: false,
    version: false,
    yes: false,
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    switch (arg) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--version":
      case "-v":
        args.version = true;
        break;
      case "--recursive":
        args.recursive = true;
        break;
      case "--yes":
      case "-y":
        args.yes = true;
        break;
      case "--source":
        args.source = requireValue(argv, ++index, arg);
        break;
      case "--output":
        args.output = requireValue(argv, ++index, arg);
        break;
      case "--preset": {
        const preset = requireValue(argv, ++index, arg) as CliPreset;
        if (!PRESETS.has(preset)) {
          throw new Error(`Invalid preset: ${preset}`);
        }
        args.preset = preset;
        break;
      }
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  return args;
}

function requireValue(argv: string[], index: number, option: string): string {
  const value = argv[index];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${option}`);
  }
  return value;
}
