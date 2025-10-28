export interface XamanConnection {
  address: string;
  connected: boolean;
}

export const xamanService = {
  async connect(): Promise<XamanConnection> {
    try {
      const address = prompt('Please enter your XRPL wallet address (starts with "r"):');
      
      if (!address || !address.match(/^r[a-zA-Z0-9]{24,34}$/)) {
        throw new Error('Invalid XRPL wallet address');
      }
      
      localStorage.setItem('xaman_address', address);
      
      return {
        address,
        connected: true,
      };
    } catch (error) {
      console.error('Xaman connection error:', error);
      throw error;
    }
  },

  async disconnect(): Promise<void> {
    try {
      localStorage.removeItem('xaman_address');
    } catch (error) {
      console.error('Xaman disconnect error:', error);
      throw error;
    }
  },

  getConnectedAddress(): string | null {
    return localStorage.getItem('xaman_address');
  },

  isConnected(): boolean {
    return !!localStorage.getItem('xaman_address');
  },
};

export default xamanService;
