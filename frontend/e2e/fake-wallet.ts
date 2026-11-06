// A scriptable EIP-1193 browser wallet for tests. It forwards everything to the Hardhat node
// (whose accounts are unlocked, so no keys are involved) and lets a test simulate what a real
// user does in MetaMask: reject, switch network, switch account, disconnect.
// Connection state lives in sessionStorage so it survives page reloads, like a real wallet.

export type WalletConfig = { rpcUrl: string; account: string; chainId: number };

export function installFakeWallet(cfg: WalletConfig) {
  const saved = JSON.parse(sessionStorage.getItem("__fakeWallet") ?? "null") as
    | { connected: boolean; account: string; chainId: number }
    | null;
  const state = {
    connected: saved?.connected ?? false,
    account: saved?.account ?? cfg.account,
    chainId: saved?.chainId ?? cfg.chainId,
    rejectNext: false,
  };
  const persist = () =>
    sessionStorage.setItem("__fakeWallet", JSON.stringify({ connected: state.connected, account: state.account, chainId: state.chainId }));
  const listeners: Record<string, ((arg: unknown) => void)[]> = {};
  const emit = (event: string, arg: unknown) => (listeners[event] ?? []).forEach((fn) => fn(arg));
  const hex = (n: number) => `0x${n.toString(16)}`;
  const accounts = () => (state.connected ? [state.account] : []);

  class ProviderError extends Error {
    code: number;
    data?: unknown;
    constructor(code: number, message: string, data?: unknown) {
      super(message);
      this.code = code;
      this.data = data;
    }
  }

  async function rpc(method: string, params: unknown[]) {
    const res = await fetch(cfg.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const body = await res.json();
    if (body.error) throw new ProviderError(body.error.code, body.error.message, body.error.data);
    return body.result;
  }

  const provider = {
    async request({ method, params = [] }: { method: string; params?: unknown[] }) {
      switch (method) {
        case "eth_requestAccounts":
          state.connected = true;
          persist();
          emit("connect", { chainId: hex(state.chainId) });
          emit("accountsChanged", accounts());
          return accounts();
        case "eth_accounts":
          return accounts();
        case "eth_chainId":
          return hex(state.chainId);
        case "net_version":
          return String(state.chainId);
        case "wallet_switchEthereumChain": {
          state.chainId = parseInt((params[0] as { chainId: string }).chainId, 16);
          persist();
          emit("chainChanged", hex(state.chainId));
          return null;
        }
        case "wallet_requestPermissions":
        case "wallet_getPermissions":
          return [{ parentCapability: "eth_accounts" }];
        case "wallet_revokePermissions":
          state.connected = false;
          persist();
          emit("accountsChanged", []);
          return null;
        case "eth_sendTransaction": {
          if (state.rejectNext) {
            state.rejectNext = false;
            throw new ProviderError(4001, "User rejected the request.");
          }
          try {
            return await rpc(method, params);
          } catch (err) {
            // Hardhat words this differently from geth/MetaMask; normalise to what real wallets return.
            if (/enough funds|insufficient funds/i.test((err as Error).message)) {
              throw new ProviderError(-32000, "insufficient funds for gas * price + value");
            }
            throw err;
          }
        }
        default:
          return rpc(method, params);
      }
    },
    on(event: string, fn: (arg: unknown) => void) {
      (listeners[event] ??= []).push(fn);
      return provider;
    },
    removeListener(event: string, fn: (arg: unknown) => void) {
      listeners[event] = (listeners[event] ?? []).filter((f) => f !== fn);
      return provider;
    },
  };

  Object.assign(window, {
    ethereum: provider,
    __wallet: {
      rejectNext: () => (state.rejectNext = true),
      setChain: (id: number) => {
        state.chainId = id;
        persist();
        emit("chainChanged", hex(id));
      },
      setAccount: (account: string) => {
        state.account = account;
        persist();
        if (state.connected) emit("accountsChanged", [account]);
      },
      disconnect: () => {
        state.connected = false;
        persist();
        emit("accountsChanged", []);
      },
    },
  });
}
