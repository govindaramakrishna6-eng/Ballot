/**
 * A deterministic 5×5 mirrored pattern + colour from an address — the same wallet always gets
 * the same picture, so people recognise wallets at a glance (like MetaMask/Etherscan avatars).
 * An address is already a hash, so its hex digits can be used directly; no extra hashing needed.
 */
export type IdenticonData = { hue: number; cells: boolean[] /* 25, row-major */ };

export function identicon(address: string): IdenticonData {
  const hex = address.toLowerCase().replace(/^0x/, "").padEnd(40, "0");
  const hue = parseInt(hex.slice(0, 4), 16) % 360;
  const cells: boolean[] = [];
  for (let row = 0; row < 5; row++) {
    const left = [0, 1, 2].map((col) => parseInt(hex[4 + row * 3 + col], 16) >= 8);
    // Mirror columns 0–1 onto 3–4 for a symmetric, face-like shape.
    cells.push(left[0], left[1], left[2], left[1], left[0]);
  }
  return { hue, cells };
}
