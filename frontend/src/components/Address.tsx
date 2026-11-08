import type { Address as Addr } from "viem";
import { useEnsName } from "../hooks/useEnsName";
import { shortAddress } from "../lib/format";
import { CopyButton } from "./CopyButton";
import { Identicon } from "./Identicon";

/**
 * ENS name if one exists, else 0x1234…abcd. The full address is always in the title attribute
 * and is what the copy button copies — a name is a convenience, the address is the identity.
 */
export function Address({ address }: { address: Addr }) {
  const { data: name } = useEnsName(address);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Identicon address={address} size={18} />
      <span className={name ? "truncate" : "mono"} title={address} data-testid="address">
        {name ?? shortAddress(address)}
      </span>
      <CopyButton value={address} label="address" />
    </span>
  );
}
