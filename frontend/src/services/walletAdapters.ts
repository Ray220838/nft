import { isInstalled, getAddress } from '@gemwallet/api';
import { Xumm } from 'xumm';

export interface WalletAdapter {
  name: string;
  isAvailable: () => Promise<boolean>;
  connect: () => Promise<string>;
}

class GemWalletAdapter implements WalletAdapter {
  name = 'Gem Wallet';

  async isAvailable(): Promise<boolean> {
    try {
      const result = await isInstalled();
      return result.result?.isInstalled || false;
    } catch {
      return false;
    }
  }

  async connect(): Promise<string> {
    try {
      const result = await getAddress();
      if (result.result && result.result.address) {
        return result.result.address;
      }
      throw new Error('Failed to get address from Gem Wallet');
    } catch (error) {
      throw new Error(`Gem Wallet connection failed: ${error}`);
    }
  }
}

class CrossmarkAdapter implements WalletAdapter {
  name = 'Crossmark';

  async isAvailable(): Promise<boolean> {
    return typeof (window as any).crossmark !== 'undefined';
  }

  async connect(): Promise<string> {
    try {
      const crossmark = (window as any).crossmark;
      if (!crossmark) {
        throw new Error('Crossmark not found');
      }
      
      const result = await crossmark.signInAndWait();
      if (result && result.response && result.response.data && result.response.data.address) {
        return result.response.data.address;
      }
      throw new Error('Failed to get address from Crossmark');
    } catch (error) {
      throw new Error(`Crossmark connection failed: ${error}`);
    }
  }
}

class XamanAdapter implements WalletAdapter {
  name = 'Xaman (QR Code)';
  private xumm: Xumm | null = null;

  async isAvailable(): Promise<boolean> {
    return true; // Always available as fallback
  }

  async connect(): Promise<string> {
    try {
      const apiKey = import.meta.env.VITE_XUMM_API_KEY;
      if (!apiKey) {
        throw new Error('Xumm API key not configured. Please set VITE_XUMM_API_KEY in .env file');
      }

      if (!this.xumm) {
        this.xumm = new Xumm(apiKey);
      }

      const authResult = await this.xumm.authorize();
      
      if (authResult && !(authResult instanceof Error)) {
        const account = (authResult as any).me?.account;
        if (account) {
          return account;
        }
      }
      
      throw new Error('Failed to authorize with Xaman');
    } catch (error) {
      throw new Error(`Xaman connection failed: ${error}`);
    }
  }
}

export const walletAdapters = {
  gem: new GemWalletAdapter(),
  crossmark: new CrossmarkAdapter(),
  xaman: new XamanAdapter(),
};

export async function detectAvailableWallets(): Promise<WalletAdapter[]> {
  const available: WalletAdapter[] = [];
  
  for (const adapter of Object.values(walletAdapters)) {
    if (await adapter.isAvailable()) {
      available.push(adapter);
    }
  }
  
  return available;
}
