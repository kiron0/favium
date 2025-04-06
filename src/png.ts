import Resize from "./resize";

class Png {
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
  }

  public generate(size: number, quality: number = 0.92): string {
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError("Size must be a positive integer");
    }
    if (quality < 0 || quality > 1) {
      throw new RangeError("Quality must be between 0 and 1");
    }

    const resizedCanvas = new Resize(this.canvas).resize(size, size);
    return resizedCanvas.toDataURL("image/png", quality);
  }
}

export default Png;
