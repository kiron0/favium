type DrawImageSource = {
  width: number;
  height: number;
};

class FakeCanvasRenderingContext2D {
  public fillStyle = "";
  public font = "";
  public textBaseline: CanvasTextBaseline = "alphabetic";
  public textAlign: CanvasTextAlign = "start";
  public readonly operations: string[] = [];

  constructor(private readonly canvas: FakeCanvas) {}

  public scale(x: number, y: number): void {
    this.operations.push(`scale:${x}x${y}`);
  }

  public setTransform(
    a: number,
    _b: number,
    _c: number,
    d: number,
    _e: number,
    _f: number,
  ): void {
    this.operations.push(`setTransform:${a}x${d}`);
  }

  public fillRect(x: number, y: number, width: number, height: number): void {
    this.operations.push(`fillRect:${x},${y},${width},${height}`);
  }

  public beginPath(): void {
    this.operations.push("beginPath");
  }

  public moveTo(x: number, y: number): void {
    this.operations.push(`moveTo:${x},${y}`);
  }

  public arcTo(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number,
  ): void {
    this.operations.push(`arcTo:${x1},${y1},${x2},${y2},${radius}`);
  }

  public closePath(): void {
    this.operations.push("closePath");
  }

  public fill(): void {
    this.operations.push("fill");
  }

  public drawImage(
    image: DrawImageSource,
    _dx: number,
    _dy: number,
    dWidth: number,
    dHeight: number,
  ): void {
    this.operations.push(
      `drawImage:${image.width}x${image.height}->${dWidth}x${dHeight}`,
    );
  }

  public measureText(text: string): TextMetrics {
    return { width: Math.max(text.length, 1) * 10 } as TextMetrics;
  }

  public fillText(text: string, x: number, y: number): void {
    this.operations.push(`fillText:${text}@${x},${y}`);
  }

  public getImageData(
    _sx: number,
    _sy: number,
    sw: number,
    sh: number,
  ): ImageData {
    const data = new Uint8ClampedArray(sw * sh * 4);

    for (let index = 0; index < data.length; index += 4) {
      data[index] = 255;
      data[index + 1] = 64;
      data[index + 2] = 32;
      data[index + 3] = 255;
    }

    return { data } as ImageData;
  }
}

class FakeCanvas {
  public width = 300;
  public height = 150;
  public style: Record<string, string> = {};
  private readonly context = new FakeCanvasRenderingContext2D(this);

  public getContext(type: string): FakeCanvasRenderingContext2D | null {
    return type === "2d" ? this.context : null;
  }

  public toDataURL(type = "image/png"): string {
    const payload = Buffer.from(
      JSON.stringify({ width: this.width, height: this.height, type }),
      "utf8",
    ).toString("base64");

    return `data:${type};base64,${payload}`;
  }

  public get operations(): string[] {
    return this.context.operations;
  }
}

export function installFakeCanvasDom(): void {
  const globalObject = globalThis as typeof globalThis & {
    HTMLCanvasElement?: typeof FakeCanvas;
    document?: { createElement: (tagName: string) => FakeCanvas };
    btoa?: (value: string) => string;
    atob?: (value: string) => string;
    devicePixelRatio?: number;
  };

  globalObject.HTMLCanvasElement =
    FakeCanvas as unknown as typeof HTMLCanvasElement;
  globalObject.document = {
    createElement(tagName: string): FakeCanvas {
      if (tagName !== "canvas") {
        throw new Error(`Unsupported element: ${tagName}`);
      }

      return new FakeCanvas();
    },
  };
  globalObject.btoa = (value: string): string =>
    Buffer.from(value, "binary").toString("base64");
  globalObject.atob = (value: string): string =>
    Buffer.from(value, "base64").toString("binary");
  if (typeof globalObject.devicePixelRatio !== "number") {
    globalObject.devicePixelRatio = 1;
  }
}

export function createCanvas(width = 128, height = 128): HTMLCanvasElement {
  const canvas = new FakeCanvas();
  canvas.width = width;
  canvas.height = height;
  return canvas as unknown as HTMLCanvasElement;
}

export function readPngMeta(dataUrl: string): {
  width: number;
  height: number;
  type: string;
} {
  const payload = dataUrl.split(",")[1] ?? "";
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8"));
}

export function decodeIco(dataUrl: string): Uint8Array {
  const payload = dataUrl.split(",")[1] ?? "";
  return new Uint8Array(Buffer.from(payload, "base64"));
}

export function getCanvasOperations(canvas: HTMLCanvasElement): string[] {
  return (canvas as unknown as FakeCanvas).operations;
}

export function setDevicePixelRatio(value: number): void {
  (
    globalThis as typeof globalThis & { devicePixelRatio?: number }
  ).devicePixelRatio = value;
}
