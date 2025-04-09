import Resize from "./resize";

/**
 * Generates ICO files from a canvas element, supporting multiple sizes.
 */
class Ico {
  private readonly canvas: HTMLCanvasElement;

  /**
   * Creates an instance of Ico.
   * @param canvas - The source canvas element to generate ICO from.
   * @throws {TypeError} If the parameter is not an HTMLCanvasElement.
   */
  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
  }

  /**
   * Generates an ICO file as a data URL with specified sizes.
   * @param sizes - Array of sizes (in pixels) for the ICO images (default: [16, 32, 48]).
   * @returns A data URL representing the ICO file.
   * @throws {RangeError} If any size is not a positive integer between 1 and 256.
   * @throws {Error} If the canvas context is unavailable.
   */
  public generate(sizes: number[] = [16, 32, 48]): string {
    if (
      !sizes.every((size) => Number.isInteger(size) && size > 0 && size <= 256)
    ) {
      throw new RangeError("Sizes must be positive integers between 1 and 256");
    }

    const masterCanvas = new Resize(this.canvas).resize(128, 128);
    const iconDirHeader = this.createIconDirHeader(sizes.length);
    let iconDirEntries = "";
    let bitmapData = "";

    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const resizedCanvas = new Resize(masterCanvas).resize(size, size);
      const bitmapInfoHeader = this.createBitmapInfoHeader(size);
      const bitmapImageData = this.createBitmapImageData(resizedCanvas);
      const bitmapSize = bitmapInfoHeader.length + bitmapImageData.length;
      const bitmapOffset = 6 + 16 * sizes.length + bitmapData.length;

      iconDirEntries += this.createIconDirEntry(size, bitmapSize, bitmapOffset);
      bitmapData += bitmapInfoHeader + bitmapImageData;
    }

    const binary = iconDirHeader + iconDirEntries + bitmapData;
    return `data:image/x-icon;base64,${btoa(binary)}`;
  }

  /**
   * Creates the icon directory header.
   * @param numImages - Number of images in the ICO file.
   * @returns Binary string for the header.
   */
  private createIconDirHeader(numImages: number): string {
    const buffer = new ArrayBuffer(6);
    const view = new DataView(buffer);
    view.setUint16(0, 0, true); // Reserved
    view.setUint16(2, 1, true); // ICO type
    view.setUint16(4, numImages, true); // Image count
    return String.fromCharCode(...new Uint8Array(buffer));
  }

  /**
   * Creates an icon directory entry.
   * @param size - Image size (width and height).
   * @param bitmapSize - Size of the bitmap data.
   * @param offset - Offset to the bitmap data.
   * @returns Binary string for the entry.
   */
  private createIconDirEntry(
    size: number,
    bitmapSize: number,
    offset: number,
  ): string {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);
    view.setUint8(0, size); // Width
    view.setUint8(1, size); // Height
    view.setUint8(2, 0); // Color count
    view.setUint8(3, 0); // Reserved
    view.setUint16(4, 1, true); // Color planes
    view.setUint16(6, 32, true); // Bits per pixel
    view.setUint32(8, bitmapSize, true); // Image size
    view.setUint32(12, offset, true); // Offset
    return String.fromCharCode(...new Uint8Array(buffer));
  }

  /**
   * Creates the bitmap info header.
   * @param size - Image size (width and height).
   * @returns Binary string for the header.
   */
  private createBitmapInfoHeader(size: number): string {
    const buffer = new ArrayBuffer(40);
    const view = new DataView(buffer);
    view.setUint32(0, 40, true); // Header size
    view.setInt32(4, size, true); // Width
    view.setInt32(8, 2 * size, true); // Height (doubled for mask)
    view.setUint16(12, 1, true); // Color planes
    view.setUint16(14, 32, true); // Bits per pixel
    view.setUint32(16, 0, true); // Compression
    view.setUint32(20, 0, true); // Image size
    return String.fromCharCode(...new Uint8Array(buffer));
  }

  /**
   * Creates bitmap image data from a canvas.
   * @param canvas - The canvas to extract data from.
   * @returns Binary string of bitmap data.
   * @throws {Error} If the canvas context is unavailable.
   */
  private createBitmapImageData(canvas: HTMLCanvasElement): string {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const rgbaData = imageData.data;
    const bgraData = new Uint8ClampedArray(rgbaData.length);

    // Convert RGBA to BGRA and rotate
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const src = (y * width + x) * 4;
        const dest = ((height - 1 - y) * width + x) * 4;
        bgraData[dest] = rgbaData[src + 2]; // B
        bgraData[dest + 1] = rgbaData[src + 1]; // G
        bgraData[dest + 2] = rgbaData[src]; // R
        bgraData[dest + 3] = rgbaData[src + 3]; // A
      }
    }

    const maskSize = (width * height) / 8;
    const bitmapMask = new Uint8Array(maskSize).fill(0); // No transparency
    return String.fromCharCode(...bgraData, ...bitmapMask);
  }
}

export default Ico;
