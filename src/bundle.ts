import IcoGenerator from "./ico";
import PngGenerator from "./png";

export interface ImageBundleOptions {
  /** Data URL for the ICO image */
  ico: string;
  /** Data URL for the 16x16 PNG image */
  png16: string;
  /** Data URL for the 32x32 PNG image */
  png32: string;
  /** Data URL for the 150x150 PNG image */
  png150: string;
  /** Data URL for the 180x180 PNG image */
  png180: string;
  /** Data URL for the 192x192 PNG image */
  png192: string;
  /** Data URL for the 512x512 PNG image */
  png512: string;
}

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
  public generate(): ImageBundleOptions {
    const icoGenerator = new IcoGenerator(this.canvas);
    const pngGenerator = new PngGenerator(this.canvas);

    return {
      ico: icoGenerator.generate([16, 32, 48]),
      png16: pngGenerator.generate(16),
      png32: pngGenerator.generate(32),
      png150: pngGenerator.generate(150),
      png180: pngGenerator.generate(180),
      png192: pngGenerator.generate(192),
      png512: pngGenerator.generate(512),
    };
  }
}

export default Bundle;
