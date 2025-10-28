import { useState, useEffect } from 'react';
import { X, Wallet, QrCode, ExternalLink } from 'lucide-react';
import { WalletAdapter, detectAvailableWallets, walletAdapters } from '../services/walletAdapters';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string) => void;
}

export default function WalletConnectModal({ isOpen, onClose, onConnect }: WalletConnectModalProps) {
  const [browserWallets, setBrowserWallets] = useState<WalletAdapter[]>([]);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      detectBrowserWallets();
    }
  }, [isOpen]);

  const detectBrowserWallets = async () => {
    const available = await detectAvailableWallets();
    setBrowserWallets(available.filter(w => w.name !== 'Xaman (QR Code)'));
  };

  const handleConnect = async (adapter: WalletAdapter) => {
    setConnecting(true);
    setError(null);
    
    try {
      const address = await adapter.connect();
      onConnect(address);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl max-w-md w-full p-6 relative border border-amber-500/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600 mb-6">
          Connect Wallet
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {browserWallets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                Browser Wallets
              </h3>
              <div className="space-y-2">
                {browserWallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => handleConnect(wallet)}
                    disabled={connecting}
                    className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 hover:from-amber-500/20 hover:to-yellow-500/20 border border-amber-500/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Wallet className="text-amber-400" size={24} />
                    <span className="text-white font-medium">{wallet.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {browserWallets.length === 0 && (
            <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 text-sm mb-2">No browser wallet detected</p>
              <div className="space-y-1 text-xs text-gray-400">
                <a
                  href="https://gemwallet.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                >
                  Install Gem Wallet <ExternalLink size={12} />
                </a>
                <a
                  href="https://crossmark.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                >
                  Install Crossmark <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
              Mobile Wallet
            </h3>
            <button
              onClick={() => handleConnect(walletAdapters.xaman)}
              disabled={connecting}
              className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <QrCode className="text-purple-400" size={24} />
              <div className="text-left">
                <div className="text-white font-medium">Xaman (QR Code)</div>
                <div className="text-xs text-gray-400">Scan with Xaman app</div>
              </div>
            </button>
          </div>
        </div>

        {connecting && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Connecting...
          </div>
        )}
      </div>
    </div>
  );
}
