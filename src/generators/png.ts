import Resize from "../utils/resize";
import { assertCanvas, assertCanvasDimensions } from "../utils/canvas";

class Png {
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    assertCanvas(canvas);
    this.canvas = canvas;
  }

  /**
   * Generates a PNG image of specified size
   * @param size - Size in pixels (width and height)
   * @returns Data URL of PNG image
   */
  public generate(size: number): string {
    assertCanvasDimensions(size, size);

    const resizedCanvas = new Resize(this.canvas).resize(size, size);
    return resizedCanvas.toDataURL("image/png");
  }
}

export default Png;
