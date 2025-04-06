class Resize {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
  }

  /**
   * Resizes the canvas to target dimensions using optimal downsampling.
   * Uses power-of-2 reductions for better quality before final resize.
   * @param targetWidth - Desired width in pixels
   * @param targetHeight - Desired height in pixels
   * @returns The resized canvas element
   * @throws {RangeError} If dimensions are invalid
   */
  public resize(targetWidth: number, targetHeight: number): HTMLCanvasElement {
    // Validate input dimensions
    if (!Number.isInteger(targetWidth) || !Number.isInteger(targetHeight)) {
      throw new RangeError("Width and height must be integers");
    }
    if (targetWidth <= 0 || targetHeight <= 0) {
      throw new RangeError("Width and height must be positive");
    }

    // Early return if no resize needed
    if (
      this.canvas.width === targetWidth &&
      this.canvas.height === targetHeight
    ) {
      return this.canvas;
    }

    // Use intermediate canvas to avoid modifying original until complete
    let currentCanvas = this.createIntermediateCanvas(
      this.canvas.width,
      this.canvas.height,
    );
    this.transferImage(this.canvas, currentCanvas);

    // Progressive downscaling by factors of 2 for better quality
    while (
      currentCanvas.width / 2 >= targetWidth &&
      currentCanvas.height / 2 >= targetHeight
    ) {
      const newWidth = Math.floor(currentCanvas.width / 2);
      const newHeight = Math.floor(currentCanvas.height / 2);
      currentCanvas = this.downscale(currentCanvas, newWidth, newHeight);
    }

    // Final resize if needed
    if (
      currentCanvas.width > targetWidth ||
      currentCanvas.height > targetHeight
    ) {
      currentCanvas = this.downscale(currentCanvas, targetWidth, targetHeight);
    }

    this.canvas = currentCanvas;
    return this.canvas;
  }

  /**
   * Creates an intermediate canvas with specified dimensions
   * @private
   */
  private createIntermediateCanvas(
    width: number,
    height: number,
  ): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Transfers image data between canvases
   * @private
   */
  private transferImage(
    source: HTMLCanvasElement,
    target: HTMLCanvasElement,
  ): void {
    const context = target.getContext("2d");
    if (!context) {
      throw new Error("Failed to get 2D context");
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, target.width, target.height);
  }

  /**
   * Performs a single downscale operation with optimal quality settings
   * @private
   */
  private downscale(
    source: HTMLCanvasElement,
    width: number,
    height: number,
  ): HTMLCanvasElement {
    const target = this.createIntermediateCanvas(width, height);
    this.transferImage(source, target);
    return target;
  }

  /**
   * Getter for the current canvas
   */
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}

export default Resize;
