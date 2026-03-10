export interface GeneratedImageBundle {
  /** Data URL for the ICO image */
  ico: string;
  /** PNG images keyed by pixel size */
  pngs: Record<number, string>;
  /** Data URL for the 16x16 PNG image */
  png16?: string;
  /** Data URL for the 32x32 PNG image */
  png32?: string;
  /** Data URL for the 150x150 PNG image */
  png150?: string;
  /** Data URL for the 180x180 PNG image */
  png180?: string;
  /** Data URL for the 192x192 PNG image */
  png192?: string;
  /** Data URL for the 512x512 PNG image */
  png512?: string;
}

export interface ImageBundleOptions extends GeneratedImageBundle {
  /** Data URL for the 16x16 PNG image */
  png16: string;
  /** Data URL for the 32x32 PNG image */
  png32: string;
  /** Data URL for the 150x150 PNG image */
  png150: string;
  /** Data URL for the 180x180 PNG image */
  png180: string;
  /** Data URL for the 192x192 PNG image */
  png192: string;
  /** Data URL for the 512x512 PNG image */
  png512: string;
}

export interface BundleGeneratorOptions {
  /** Sizes in pixels to include in the ICO image (default: [16, 32, 48]) */
  icoSizes?: number[];
  /** Sizes in pixels to include in the PNG bundle (default: [16, 32, 150, 180, 192, 512]) */
  pngSizes?: number[];
}

export interface TextIconGeneratorOptions {
  /** Canvas width in pixels (default: 128) */
  width?: number;
  /** Canvas height in pixels (default: 128) */
  height?: number;
  /** Text to display, or null for no text (default: "F") */
  text?: string | null;
  /** Text color (CSS color value, default: "white") */
  fontColor?: string;
  /** Font family (CSS font-family value, default: "Helvetica") */
  fontFamily?: string;
  /** Font size in pixels (default: 64) */
  fontSize?: number;
  /** Font weight (CSS font-weight value, default: "400") */
  fontWeight?: string;
  /** Font style (CSS font-style value, default: "normal") */
  fontStyle?: string;
  /** Corner radius in pixels (0 = square, >= min(width, height)/2 = circle, default: 0) */
  cornerRadius?: number;
  /** Background color (CSS color value, default: "black") */
  backgroundColor?: string;
  /** Device pixel ratio override for canvas backing resolution (default: window.devicePixelRatio or 1) */
  pixelRatio?: number;
}
