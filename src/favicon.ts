import Bundle, { ImageBundle } from "./bundle";
import Ico from "./ico";
import Png from "./png";
import Resize from "./resize";

class Favium {
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
  }

  /**
   * Generates a complete bundle of favicon images
   * @returns Bundle containing ICO and various PNG sizes
   */
  public bundle(): ImageBundle {
    return new Bundle(this.canvas).generate();
  }

  /**
   * Generates an ICO file with specified sizes
   * @param sizes - Array of sizes in pixels
   * @returns Data URL of ICO image
   */
  public ico(sizes: number[] = [16, 32, 48]): string {
    return new Ico(this.canvas).generate(sizes);
  }

  /**
   * Generates a PNG image of specified size
   * @param size - Size in pixels (width and height)
   * @returns Data URL of PNG image
   */
  public png(size: number): string {
    return new Png(this.canvas).generate(size);
  }

  /**
   * Resizes the canvas to specified dimensions
   * @param size - Size in pixels (width and height)
   * @returns Resized canvas element
   */
  public resize(size: number): HTMLCanvasElement {
    return new Resize(this.canvas).resize(size, size);
  }
}

export default Favium;
