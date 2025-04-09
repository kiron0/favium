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
  private ctx!: CanvasRenderingContext2D;

  private width!: number;
  private height!: number;
  private text!: string | null;
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
  }

  public generate(options: TextIconGeneratorOptions = {}): HTMLCanvasElement {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    this.ctx = ctx;

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

    const data = { ...defaults, ...options };
    this.width = data.width!;
    this.height = data.height!;
    this.text = data.text ?? null;
    this.fontColor = data.fontColor!;
    this.fontFamily = data.fontFamily!;
    this.fontSize = data.fontSize!;
    this.fontWeight = data.fontWeight!;
    this.fontStyle = data.fontStyle!;
    this.shape = data.shape!;
    this.backgroundColor = data.backgroundColor!;

    this.canvas.width = 2 * this.width;
    this.canvas.height = 2 * this.height;
    this.canvas.style.width = this.width + "px";
    this.canvas.style.height = this.height + "px";
    this.ctx.scale(2, 2);

    this.drawBackground();

    if (this.text) {
      this.drawText();
    }

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
        break;
    }
  }

  private drawSquare(): void {
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.width, this.height);
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fill();
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
    this.ctx.beginPath();
    const radius = this.height / 10;
    this.ctx.moveTo(this.width, this.height);
    this.ctx.arcTo(0, this.height, 0, 0, radius);
    this.ctx.arcTo(0, 0, this.width, 0, radius);
    this.ctx.arcTo(this.width, 0, this.width, this.height, radius);
    this.ctx.arcTo(this.width, this.height, 0, this.height, radius);
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fill();
  }

  private drawText(): void {
    if (!this.text) return;

    this.ctx.fillStyle = this.fontColor;
    this.ctx.font = this.fontString();
    this.ctx.textBaseline = "alphabetic";
    this.ctx.textAlign = "center";
    const offsets = this.measureOffsets(this.text, this.fontSize);
    const x = this.width / 2 + offsets.horizontal;
    const y = this.height / 2 + offsets.vertical;
    this.ctx.fillText(this.text, x, y);
  }

  private measureOffsets(
    text: string,
    fontSize: number,
  ): { vertical: number; horizontal: number } {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get 2D context");
    ctx.font = this.fontString();

    canvas.width = 2 * ctx.measureText(text).width;
    canvas.height = 2 * fontSize;

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error(
        "Canvas dimensions must be greater than 0 before calling getImageData",
      );
    }

    ctx.font = this.fontString();
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "center";
    ctx.fillStyle = "white";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    let textTop: number | undefined;
    let textBottom: number | undefined;
    for (let y = 0; y <= canvas.height; y++) {
      for (let x = 0; x <= canvas.width; x++) {
        const r_index = 4 * (canvas.width * y + x);
        const r_value = data[r_index];

        if (r_value === 255) {
          if (!textTop) {
            textTop = y;
          }
          textBottom = y;
          break;
        }
      }
    }

    const canvasHorizontalCenterLine = canvas.height / 2;
    const textHorizontalCenterLine =
      textTop !== undefined && textBottom !== undefined
        ? (textBottom - textTop) / 2 + textTop
        : canvasHorizontalCenterLine;

    let textLeft: number | undefined;
    let textRight: number | undefined;
    for (let x = 0; x <= canvas.width; x++) {
      for (let y = 0; y <= canvas.height; y++) {
        const r_index = 4 * (canvas.width * y + x);
        const r_value = data[r_index];

        if (r_value === 255) {
          if (!textLeft) {
            textLeft = x;
          }
          textRight = x;
          break;
        }
      }
    }

    const canvasVerticalCenterLine = canvas.width / 2;
    const textVerticalCenterLine =
      textLeft !== undefined && textRight !== undefined
        ? (textRight - textLeft) / 2 + textLeft
        : canvasVerticalCenterLine;

    return {
      vertical: canvasHorizontalCenterLine - textHorizontalCenterLine,
      horizontal: canvasVerticalCenterLine - textVerticalCenterLine,
    };
  }

  private fontString(): string {
    return `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
  }
}

export default TextIconGenerator;
