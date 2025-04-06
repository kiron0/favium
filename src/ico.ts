import Resize from "./resize";

class Ico {
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
  }

  public generate(sizes: number[] = [16, 32, 48]): string {
    if (!this.validateSizes(sizes)) {
      throw new RangeError("Sizes must be positive integers between 1 and 256");
    }

    const masterCanvas = new Resize(this.canvas).resize(128, 128);
    const iconDirHeader = this.createIconDirectoryHeader(sizes.length);
    let iconDirEntries = "";
    let bitmapData = "";

    for (let i = 0; i < sizes.length; i++) {
      const size = sizes[i];
      const resizedCanvas = new Resize(masterCanvas).resize(size, size);
      const bitmapInfoHeader = this.createBitmapInfoHeader(size, size);
      const bitmapImageData = this.createBitmapImageData(resizedCanvas);
      const bitmapSize = bitmapInfoHeader.length + bitmapImageData.length;
      const bitmapOffset = this.calculateBitmapOffset(sizes, i);

      iconDirEntries += this.createIconDirectoryEntry(
        size,
        size,
        bitmapSize,
        bitmapOffset,
      );
      bitmapData += bitmapInfoHeader + bitmapImageData;
    }

    const binary = iconDirHeader + iconDirEntries + bitmapData;
    return `data:image/x-icon;base64,${btoa(binary)}`;
  }

  private validateSizes(sizes: number[]): boolean {
    return sizes.every(
      (size) => Number.isInteger(size) && size > 0 && size <= 256,
    );
  }

  private calculateBitmapOffset(sizes: number[], entry: number): number {
    let offset = 6 + 16 * sizes.length; // header + entries
    for (let i = 0; i < entry; i++) {
      const size = sizes[i];
      offset += 40 + 4 * size * size + (2 * size * size) / 8;
    }
    return offset;
  }

  private createBitmapImageData(canvas: HTMLCanvasElement): string {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const bitmapBuffer = this.canvasToBitmap(canvas, imageData);
    const maskSize = (width * height * 2) / 8;
    const bitmapMask = new Uint8Array(maskSize).fill(0);

    return (
      this.arrayBufferToBinary(bitmapBuffer) +
      this.arrayBufferToBinary(bitmapMask.buffer)
    );
  }

  private canvasToBitmap(
    canvas: HTMLCanvasElement,
    imageData: ImageData,
  ): ArrayBuffer {
    const { width, height } = canvas;
    const rgbaData8 = imageData.data;
    const bgraData8 = new Uint8ClampedArray(rgbaData8.length);

    // Convert RGBA to BGRA
    for (let i = 0; i < rgbaData8.length; i += 4) {
      bgraData8[i] = rgbaData8[i + 2]; // B
      bgraData8[i + 1] = rgbaData8[i + 1]; // G
      bgraData8[i + 2] = rgbaData8[i]; // R
      bgraData8[i + 3] = rgbaData8[i + 3]; // A
    }

    // Rotate/flip image
    const bgraData32 = new Uint32Array(bgraData8.buffer);
    const rotatedData32 = new Uint32Array(bgraData32.length);
    for (let i = 0; i < bgraData32.length; i++) {
      const x = i % width;
      const y = Math.floor(i / width);
      const rotatedIndex = (height - 1 - y) * width + x;
      rotatedData32[rotatedIndex] = bgraData32[i];
    }

    return rotatedData32.buffer;
  }

  private createIconDirectoryHeader(numImages: number): string {
    const buffer = new ArrayBuffer(6);
    const view = new DataView(buffer);
    view.setUint16(0, 0, true); // Reserved
    view.setUint16(2, 1, true); // ICO type
    view.setUint16(4, numImages, true); // Image count
    return this.arrayBufferToBinary(buffer);
  }

  private createIconDirectoryEntry(
    width: number,
    height: number,
    size: number,
    offset: number,
  ): string {
    const buffer = new ArrayBuffer(16);
    const view = new DataView(buffer);
    view.setUint8(0, width); // Width
    view.setUint8(1, height); // Height
    view.setUint8(2, 0); // Color count
    view.setUint8(3, 0); // Reserved
    view.setUint16(4, 1, true); // Color planes
    view.setUint16(6, 32, true); // Bits per pixel
    view.setUint32(8, size, true); // Image size
    view.setUint32(12, offset, true); // Offset
    return this.arrayBufferToBinary(buffer);
  }

  private createBitmapInfoHeader(width: number, height: number): string {
    const buffer = new ArrayBuffer(40);
    const view = new DataView(buffer);
    view.setUint32(0, 40, true); // Header size
    view.setInt32(4, width, true); // Width
    view.setInt32(8, 2 * height, true); // Height (doubled for mask)
    view.setUint16(12, 1, true); // Color planes
    view.setUint16(14, 32, true); // Bits per pixel
    view.setUint32(16, 0, true); // Compression
    view.setUint32(20, 0, true); // Image size
    return this.arrayBufferToBinary(buffer);
  }

  private arrayBufferToBinary(buffer: ArrayBuffer): string {
    return String.fromCharCode(...new Uint8Array(buffer));
  }
}

export default Ico;
