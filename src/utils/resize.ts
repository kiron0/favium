import { assertCanvas, assertCanvasDimensions } from "./canvas";

class Resize {
  private canvas: HTMLCanvasElement;
  /**
   * Creates an instance of Resize.
   * @param canvas - The source canvas element to resize.
   * @throws {TypeError} If the parameter is not an HTMLCanvasElement.
   */
  constructor(canvas: HTMLCanvasElement) {
    assertCanvas(canvas);
    this.canvas = canvas;
  }

  /**
   * Generates a resized canvas element with specified dimensions.
   * @param width - The desired width of the canvas.
   * @param height - The desired height of the canvas.
   * @returns The resized canvas element.
   * @throws {RangeError} If width or height is not a positive integer.
   */
  public resize(width: number, height: number): HTMLCanvasElement {
    assertCanvasDimensions(width, height);

    while (this.canvas.width / 2 >= width && this.canvas.height / 2 >= height) {
      this._resize(
        Math.max(width, Math.floor(this.canvas.width / 2)),
        Math.max(height, Math.floor(this.canvas.height / 2)),
      );
    }

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this._resize(width, height);
    }

    return this.canvas;
  }

  /**
   * Simple resize of a canvas element.
   */
  private _resize(width: number, height: number): void {
    const canvas = document.createElement("canvas");
    const resizedContext = canvas.getContext("2d");
    if (!resizedContext) {
      throw new Error("Failed to get 2D context");
    }
    canvas.width = width;
    canvas.height = height;
    resizedContext.drawImage(this.canvas, 0, 0, width, height);
    this.canvas = canvas;
  }
}

export default Resize;
