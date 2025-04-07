interface TextIconGeneratorOptions {
  canvas?: HTMLCanvasElement;
  width?: number;
  height?: number;
  text?: string;
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
  private ctx: CanvasRenderingContext2D;

  private width!: number;
  private height!: number;
  private text!: string;
  private fontColor!: string;
  private fontFamily!: string;
  private fontSize!: number;
  private fontWeight!: string;
  private fontStyle!: string;
  private shape!: "square" | "circle" | "rounded";
  private backgroundColor!: string;

  constructor(canvas: HTMLCanvasElement) {
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new TypeError("Parameter must be an HTMLCanvasElement");
    }
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;
  }

  public generate(options: TextIconGeneratorOptions = {}): HTMLCanvasElement {
    const defaults: TextIconGeneratorOptions = {
      width: 128,
      height: 128,
      text: "C",
      fontColor: "white",
      fontFamily: "Helvetica",
      fontSize: 64,
      fontWeight: "400",
      fontStyle: "normal",
      shape: "square",
      backgroundColor: "black",
    };

    const config = { ...defaults, ...options };
    this.width = config.width!;
    this.height = config.height!;
    this.text = config.text!;
    this.fontColor = config.fontColor!;
    this.fontFamily = config.fontFamily!;
    this.fontSize = config.fontSize!;
    this.fontWeight = config.fontWeight!;
    this.fontStyle = config.fontStyle!;
    this.shape = config.shape!;
    this.backgroundColor = config.backgroundColor!;

    // Set up canvas for retina displays
    this.canvas.width = 2 * this.width;
    this.canvas.height = 2 * this.height;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(2, 2);

    this.drawBackground();
    this.drawText();

    return this.canvas;
  }

  private drawBackground(): void {
    switch (this.shape) {
      case "square":
        this.drawSquare();
        break;
      case "circle":
        this.drawCircle();
        break;
      case "rounded":
        this.drawRounded();
        break;
      default:
        this.drawSquare();
    }
  }

  private drawSquare(): void {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawCircle(): void {
    this.ctx.beginPath();
    this.ctx.arc(
      this.width / 2,
      this.height / 2,
      this.height / 2,
      0,
      2 * Math.PI,
      false,
    );
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fill();
  }

  private drawRounded(): void {
    const radius = this.height / 10;
    this.ctx.beginPath();
    this.ctx.moveTo(this.width, this.height - radius);
    this.ctx.arcTo(
      this.width,
      this.height,
      this.width - radius,
      this.height,
      radius,
    );
    this.ctx.arcTo(0, this.height, 0, this.height - radius, radius);
    this.ctx.arcTo(0, 0, radius, 0, radius);
    this.ctx.arcTo(this.width, 0, this.width, radius, radius);
    this.ctx.closePath();
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fill();
  }

  private drawText(): void {
    this.ctx.fillStyle = this.fontColor;
    this.ctx.font = this.fontString();
    this.ctx.textBaseline = "alphabetic";
    this.ctx.textAlign = "center";

    const offsets = this.measureOffsets();
    const x = this.width / 2 + offsets.horizontal;
    const y = this.height / 2 + offsets.vertical;
    this.ctx.fillText(this.text, x, y);
  }

  private measureOffsets(): { vertical: number; horizontal: number } {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");

    ctx.font = this.fontString();
    const textMetrics = ctx.measureText(this.text);

    canvas.width = 2 * textMetrics.width;
    canvas.height = 2 * this.fontSize;
    ctx.font = this.fontString();
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(this.text, canvas.width / 2, canvas.height / 2);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let top: number | undefined, bottom: number | undefined;
    let left: number | undefined, right: number | undefined;

    for (let y = 0; y < canvas.height && (!top || !bottom); y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = 4 * (canvas.width * y + x);
        if (imageData[index] === 255) {
          top = top === undefined ? y : top;
          bottom = y;
          break;
        }
      }
    }

    for (let x = 0; x < canvas.width && (!left || !right); x++) {
      for (let y = 0; y < canvas.height; y++) {
        const index = 4 * (canvas.width * y + x);
        if (imageData[index] === 255) {
          left = left === undefined ? x : left;
          right = x;
          break;
        }
      }
    }

    const canvasHCenter = canvas.height / 2;
    const canvasVCenter = canvas.width / 2;
    const textHCenter =
      top !== undefined && bottom !== undefined
        ? (bottom - top) / 2 + top
        : canvasHCenter;
    const textVCenter =
      left !== undefined && right !== undefined
        ? (right - left) / 2 + left
        : canvasVCenter;

    return {
      vertical: canvasHCenter - textHCenter,
      horizontal: canvasVCenter - textVCenter,
    };
  }

  private fontString(): string {
    return `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
  }
}

export default TextIconGenerator;
