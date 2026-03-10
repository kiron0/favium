import IcoGenerator from "./ico";
import {
  BundleGeneratorOptions,
  GeneratedImageBundle,
  ImageBundleOptions,
} from "../types";
import PngGenerator from "./png";

const DEFAULT_ICO_SIZES = [16, 32, 48];
const DEFAULT_PNG_SIZES = [16, 32, 150, 180, 192, 512];
const PNG_SIZE_KEYS: Record<number, keyof ImageBundleOptions> = {
  16: "png16",
  32: "png32",
  150: "png150",
  180: "png180",
  192: "png192",
  512: "png512",
};

class Bundle {
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
  }

  /**
   * Generates a bundle of various image formats and sizes
   * @returns Object containing ICO and PNG data URLs
   */
  public generate(): ImageBundleOptions;
  public generate(options: BundleGeneratorOptions): GeneratedImageBundle;
  public generate(
    options: BundleGeneratorOptions = {},
  ): ImageBundleOptions | GeneratedImageBundle {
    const icoGenerator = new IcoGenerator(this.canvas);
    const pngGenerator = new PngGenerator(this.canvas);
    const icoSizes = options.icoSizes ?? DEFAULT_ICO_SIZES;
    const pngSizes = options.pngSizes ?? DEFAULT_PNG_SIZES;
    const bundle: GeneratedImageBundle = {
      ico: icoGenerator.generate(icoSizes),
      pngs: {},
    };

    for (const size of pngSizes) {
      const png = pngGenerator.generate(size);
      bundle.pngs[size] = png;

      const key = PNG_SIZE_KEYS[size];
      if (key) {
        bundle[key] = png;
      }
    }

    return bundle;
  }
}

export default Bundle;
