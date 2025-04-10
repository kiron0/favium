import Resize from "./resize";

class Png {
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
  }

  /**
   * Generates a PNG image of specified size
   * @param size - Size in pixels (width and height)
   * @returns Data URL of PNG image
   */
  public generate(size: number): string {
    if (!Number.isInteger(size) || size <= 0) {
      throw new RangeError("Size must be a positive integer");
    }

    const resizedCanvas = new Resize(this.canvas).resize(size, size);
    return resizedCanvas.toDataURL();
  }
}

export default Png;
