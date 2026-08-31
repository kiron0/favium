export const MAX_CANVAS_DIMENSION = 4096;
export const MAX_CANVAS_PIXELS = MAX_CANVAS_DIMENSION * MAX_CANVAS_DIMENSION;

export function assertCanvas(
  value: unknown,
): asserts value is HTMLCanvasElement {
  if (
    typeof value !== "object" ||
    value === null ||
    !("width" in value) ||
    typeof value.width !== "number" ||
    !("height" in value) ||
    typeof value.height !== "number" ||
    !("getContext" in value) ||
    typeof value.getContext !== "function" ||
    !("toDataURL" in value) ||
    typeof value.toDataURL !== "function"
  ) {
    throw new TypeError("Parameter must be an HTMLCanvasElement");
  }

  assertCanvasDimensions(value.width, value.height);
}

export function assertCanvasDimensions(width: number, height: number): void {
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new RangeError("Width and height must be finite integers");
  }
  if (width <= 0 || height <= 0) {
    throw new RangeError("Width and height must be positive");
  }
  if (
    width > MAX_CANVAS_DIMENSION ||
    height > MAX_CANVAS_DIMENSION ||
    width * height > MAX_CANVAS_PIXELS
  ) {
    throw new RangeError(
      `Canvas dimensions must not exceed ${MAX_CANVAS_DIMENSION}x${MAX_CANVAS_DIMENSION}`,
    );
  }
}
