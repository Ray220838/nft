import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wallet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiService, WhitelistCreate } from '../services/api';
import WalletConnectModal from '../components/WalletConnectModal';

const countries = [
  'USA', 'Canada', 'UK', 'Australia', 'Germany', 'France', 'Japan', 'China', 'India', 'Brazil', 'Mexico', 'Other'
];

export default function HomePage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [nftData, setNftData] = useState<any>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const [formData, setFormData] = useState<WhitelistCreate>({
    full_name: '',
    email: '',
    wallet_address: '',
    street_address: '',
    city: '',
    state_province: '',
    zip_postal: '',
    country: 'USA',
    phone_number: '',
  });

  useEffect(() => {
    const savedAddress = localStorage.getItem('xrpl_wallet_address');
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setIsConnected(true);
      setFormData(prev => ({ ...prev, wallet_address: savedAddress }));
      verifyNFTs(savedAddress);
    }
  }, []);

  const handleWalletConnect = async (address: string) => {
    setWalletAddress(address);
    setIsConnected(true);
    setFormData(prev => ({ ...prev, wallet_address: address }));
    localStorage.setItem('xrpl_wallet_address', address);
    await verifyNFTs(address);
    setMessage({ type: 'success', text: 'Wallet connected successfully!' });
  };

  const verifyNFTs = async (address: string) => {
    try {
      const response = await apiService.verifyNFTOwnership(address);
      setNftData(response.data);
    } catch (error) {
      console.error('NFT verification error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await apiService.createWhitelistEntry(formData);
      setMessage({ type: 'success', text: 'Successfully registered for whitelist!' });
      setFormData({
        full_name: '',
        email: '',
        wallet_address: isConnected ? walletAddress : '',
        street_address: '',
        city: '',
        state_province: '',
        zip_postal: '',
        country: 'USA',
        phone_number: '',
      });
    } catch (error: any) {
      console.error('Whitelist submission error:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.detail || 'Failed to submit whitelist entry. Please try again.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/background.jpg')] bg-no-repeat bg-contain bg-top opacity-25 md:bg-cover md:bg-right"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-end items-center mb-8">
          <Link to="/admin/login">
            <Button variant="outline" className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black">
              Admin Login
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="bg-black/80 border-amber-500/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl text-amber-400">WHITELIST REGISTRATION</CardTitle>
              <CardDescription className="text-gray-300">
                Connect your Xaman wallet and register for exclusive access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {message && (
                <Alert className={message.type === 'success' ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}>
                  {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div>
                  <Label className="text-amber-400">XRPL Wallet Connection</Label>
                  {!isConnected ? (
                    <Button
                      onClick={() => setShowWalletModal(true)}
                      className="w-full mt-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Connect Wallet
                    </Button>
                  ) : (
                    <div className="mt-2 p-4 bg-green-900/30 border border-green-500 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-300">Connected Wallet</p>
                          <p className="font-mono text-green-400">{walletAddress}</p>
                        </div>
                        <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                      {nftData && (
                        <div className="mt-3 pt-3 border-t border-green-500/30">
                          <p className="text-sm text-gray-300">
                            Total NFTs: <span className="text-white font-bold">{nftData.total_nfts}</span>
                          </p>
                          <p className="text-sm text-gray-300">
                            Tracked NFTs: <span className="text-amber-400 font-bold">{nftData.tracked_nfts?.length || 0}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="full_name" className="text-amber-400">Full Name *</Label>
                    <Input
                      id="full_name"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-amber-400">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="wallet_address" className="text-amber-400">XRPL Wallet Address *</Label>
                    <Input
                      id="wallet_address"
                      name="wallet_address"
                      value={formData.wallet_address}
                      onChange={handleInputChange}
                      required
                      pattern="r[a-zA-Z0-9]{24,34}"
                      className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500 font-mono"
                      placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX..."
                      disabled={isConnected}
                    />
                    <p className="text-xs text-gray-400 mt-1">Must be a valid XRPL address (starts with 'r').</p>
                  </div>

                  <div className="pt-4 border-t border-amber-500/30">
                    <h3 className="text-xl text-amber-400 mb-4">Shipping Address *</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="street_address" className="text-gray-300">Street Address</Label>
                        <Input
                          id="street_address"
                          name="street_address"
                          value={formData.street_address}
                          onChange={handleInputChange}
                          required
                          className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                          placeholder="123 Main St, Apt 4B"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city" className="text-gray-300">City</Label>
                          <Input
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            required
                            className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                            placeholder="New York"
                          />
                        </div>

                        <div>
                          <Label htmlFor="state_province" className="text-gray-300">State / Province</Label>
                          <Input
                            id="state_province"
                            name="state_province"
                            value={formData.state_province}
                            onChange={handleInputChange}
                            required
                            className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                            placeholder="NY"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="zip_postal" className="text-gray-300">Zip / Postal Code</Label>
                          <Input
                            id="zip_postal"
                            name="zip_postal"
                            value={formData.zip_postal}
                            onChange={handleInputChange}
                            required
                            className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                            placeholder="10001"
                          />
                        </div>

                        <div>
                          <Label htmlFor="country" className="text-gray-300">Country</Label>
                          <select
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleInputChange}
                            required
                            className="w-full h-10 px-3 rounded-md bg-gray-900/50 border border-amber-500/30 text-white"
                          >
                            {countries.map(country => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400">
                        Your full address is required for physical merchandise or airdrops.
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone_number" className="text-gray-300">Phone Number (Optional)</Label>
                    <Input
                      id="phone_number"
                      name="phone_number"
                      type="tel"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                      placeholder="(555) 555-5555"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold text-lg py-6"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'JOIN WHITELIST'
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {nftData && nftData.tracked_nfts && nftData.tracked_nfts.length > 0 && (
            <Card className="mt-8 bg-black/80 border-amber-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl text-amber-400">Your NFT Collection</CardTitle>
                <CardDescription className="text-gray-300">
                  Tracked NFTs from verified collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nftData.tracked_nfts.map((nft: any, index: number) => (
                    <div key={index} className="p-4 bg-gray-900/50 border border-amber-500/30 rounded-lg">
                      <p className="text-sm text-amber-400 font-bold">{nft.collection_name}</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono truncate">{nft.nft_id}</p>
                      <p className="text-xs text-gray-500 mt-2">Taxon: {nft.taxon}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <WalletConnectModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={handleWalletConnect}
      />
    </div>
  );
}
