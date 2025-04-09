export interface TextIconGeneratorOptions {
  width?: number;
  height?: number;
  text?: string | null;
  fontColor?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  shape?: "square" | "circle" | "rounded";
  backgroundColor?: string;
}

class TextIconGenerator {
  private readonly canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
  }

  /** Generates an icon on the provided canvas and returns it. */
  public generate(options: TextIconGeneratorOptions = {}): HTMLCanvasElement {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    // Default options
    const defaults: Required<TextIconGeneratorOptions> = {
      width: 128,
      height: 128,
      text: null,
      fontColor: "white",
      fontFamily: "Helvetica",
      fontSize: 64,
      fontWeight: "400",
      fontStyle: "normal",
      shape: "square",
      backgroundColor: "black",
    };

    // Merge options with defaults
    const {
      width,
      height,
      text,
      fontColor,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      shape,
      backgroundColor,
    } = {
      ...defaults,
      ...options,
    };

    // Input validation
    if (typeof width !== "number" || width <= 0)
      throw new Error("Width must be a positive number");
    if (typeof height !== "number" || height <= 0)
      throw new Error("Height must be a positive number");
    if (typeof fontSize !== "number" || fontSize <= 0)
      throw new Error("Font size must be a positive number");
    if (!["square", "circle", "rounded"].includes(shape))
      throw new Error('Shape must be "square", "circle", or "rounded"');

    // Set canvas size for high-DPI displays
    this.canvas.width = width * 2;
    this.canvas.height = height * 2;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    ctx.scale(2, 2);

    // Draw background
    ctx.fillStyle = backgroundColor;
    switch (shape) {
      case "square":
        ctx.fillRect(0, 0, width, height);
        break;
      case "circle": {
        const radius = Math.min(width, height) / 2;
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
        ctx.fill();
        break;
      }
      case "rounded": {
        const radius = Math.min(width, height) / 10;
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.arcTo(width, 0, width, height, radius);
        ctx.arcTo(width, height, 0, height, radius);
        ctx.arcTo(0, height, 0, 0, radius);
        ctx.arcTo(0, 0, width, 0, radius);
        ctx.closePath();
        ctx.fill();
        break;
      }
    }

    // Draw text if provided
    if (text) {
      const font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = fontColor;
      ctx.font = font;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "center";

      const offsets = this.measureOffsets(ctx, text, fontSize);
      ctx.fillText(
        text,
        width / 2 + offsets.horizontal,
        height / 2 + offsets.vertical,
      );
    }

    return this.canvas;
  }

  /** Measures text offsets for precise centering. */
  private measureOffsets(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontSize: number,
  ): { vertical: number; horizontal: number } {
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) throw new Error("Failed to get 2D context");

    tempCanvas.width = 2 * ctx.measureText(text).width || 1; // Avoid zero width
    tempCanvas.height = 2 * fontSize;
    tempCtx.font = ctx.font;
    tempCtx.textBaseline = "alphabetic";
    tempCtx.textAlign = "center";
    tempCtx.fillStyle = "white";
    tempCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);

    const data = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height,
    ).data;

    let top: number | undefined,
      bottom: number | undefined,
      left: number | undefined,
      right: number | undefined;
    for (let y = 0; y < tempCanvas.height; y++) {
      for (let x = 0; x < tempCanvas.width; x++) {
        if (data[4 * (y * tempCanvas.width + x)] === 255) {
          top = top === undefined ? y : top;
          bottom = y;
          break;
        }
      }
    }
    for (let x = 0; x < tempCanvas.width; x++) {
      for (let y = 0; y < tempCanvas.height; y++) {
        if (data[4 * (y * tempCanvas.width + x)] === 255) {
          left = left === undefined ? x : left;
          right = x;
          break;
        }
      }
    }

    const canvasCenterY = tempCanvas.height / 2;
    const canvasCenterX = tempCanvas.width / 2;
    const textCenterY =
      top !== undefined && bottom !== undefined
        ? top + (bottom - top) / 2
        : canvasCenterY;
    const textCenterX =
      left !== undefined && right !== undefined
        ? left + (right - left) / 2
        : canvasCenterX;

    return {
      vertical: canvasCenterY - textCenterY,
      horizontal: canvasCenterX - textCenterX,
    };
  }

  /** Static method to create and generate an icon on a new canvas. */
  static generate(options: TextIconGeneratorOptions = {}): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    const generator = new TextIconGenerator(canvas);
    return generator.generate(options);
  }
}

export default TextIconGenerator;
