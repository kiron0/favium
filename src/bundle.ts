import IcoGenerator from "./ico";
import PngGenerator from "./png";

export interface ImageBundle {
  ico: string;
  png16: string;
  png32: string;
  png150: string;
  png180: string;
  png192: string;
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
  public generate(): ImageBundle {
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
