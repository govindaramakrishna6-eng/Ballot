const encoder = new TextEncoder();

/** UTF-8 byte length — what Solidity's bytes(s).length measures (Tamil/emoji use 3–4 bytes per char). */
export function byteLength(s: string): number {
  return encoder.encode(s).length;
}
