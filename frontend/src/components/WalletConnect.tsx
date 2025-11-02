import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { formatAddress } from '../lib/utils';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:block px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-medium">
          {formatAddress(address)}
        </div>
        <button
          onClick={() => disconnect()}
          className="btn-secondary flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="btn-primary"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              Connect Wallet
            </>
          )}
        </button>
      ))}
    </div>
  );
}
