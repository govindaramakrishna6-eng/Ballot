import { shortAddress } from "../lib/format";
import { CopyButton } from "./CopyButton";

/** 0x1234…abcd with the full address on hover and a copy button. */
export function Address({ address }: { address: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="mono" title={address}>
        {shortAddress(address)}
      </span>
      <CopyButton value={address} label="address" />
    </span>
  );
}
