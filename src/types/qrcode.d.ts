// Minimal ambient declaration for the parts of `qrcode` we use (no @types dep).
declare module "qrcode" {
  interface QRCodeToStringOptions {
    type?: "svg" | "utf8" | "terminal";
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
  }
  export function toString(text: string, options?: QRCodeToStringOptions): Promise<string>;
  export function toDataURL(text: string, options?: Record<string, unknown>): Promise<string>;
  const _default: { toString: typeof toString; toDataURL: typeof toDataURL };
  export default _default;
}
