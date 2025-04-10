export interface ImageBundleOptions {
  /** Data URL for the ICO image */
  ico: string;
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

export interface TextIconGeneratorOptions {
  /** Canvas width in pixels (default: 128) */
  width?: number;
  /** Canvas height in pixels (default: 128) */
  height?: number;
  /** Text to display, or null for no text (default: null) */
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
}
