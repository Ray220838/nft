import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle, Loader2, Wallet, RefreshCw } from 'lucide-react';
import { apiService } from '../services/api';
import { detectAvailableWallets, walletAdapters } from '../services/walletAdapters';

interface AdminLoginProps {
  setIsAdmin: (value: boolean) => void;
}

export default function AdminLogin({ setIsAdmin }: AdminLoginProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  useEffect(() => {
    handleWalletLogin();
  }, []);

  const handleWalletLogin = async () => {
    setLoading(true);
    setError('');
    setAccessDenied(false);
    setConnectedWallet(null);
    localStorage.removeItem('admin_token');

    try {
      const availableWallets = await detectAvailableWallets();
      
      if (availableWallets.length === 0) {
        availableWallets.push(walletAdapters.xaman);
      }

      const wallet = availableWallets[0];
      
      const walletAddress = await wallet.connect();
      setConnectedWallet(walletAddress);
      
      const challengeResponse = await apiService.requestChallenge({ wallet_address: walletAddress });
      
      setError('Please sign the message in your wallet to authenticate...');
      
      const messageToSign = challengeResponse.data.message;
      
      let signature: string;
      let publicKey: string;
      
      if (wallet.name === 'Gem Wallet') {
        const { signMessage, getPublicKey } = await import('@gemwallet/api');
        const signResult = await signMessage(messageToSign);
        if (!signResult.result) {
          throw new Error('Failed to sign message with Gem Wallet');
        }
        signature = signResult.result.signedMessage;
        const pubKeyResult = await getPublicKey();
        if (!pubKeyResult.result) {
          throw new Error('Failed to get public key from Gem Wallet');
        }
        publicKey = pubKeyResult.result.publicKey;
      } else if (wallet.name === 'Crossmark') {
        throw new Error('Crossmark wallet signature not yet implemented. Please use Gem Wallet.');
      } else {
        throw new Error('Xaman wallet signature not yet implemented. Please use Gem Wallet.');
      }
      
      const verifyResponse = await apiService.verifySignature({
        challenge_id: challengeResponse.data.challenge_id,
        wallet_address: walletAddress,
        signature,
        public_key: publicKey
      });
      
      localStorage.setItem('admin_token', verifyResponse.data.access_token);
      setIsAdmin(true);
      navigate('/admin/dashboard');
    } catch (err: any) {
      console.error('Wallet login error:', err);
      const errorDetail = err.response?.data?.detail || err.message || 'Wallet authentication failed';
      
      if (err.response?.status === 403 || errorDetail.includes('not authorized')) {
        setAccessDenied(true);
        setError(`Access Denied: Wallet ${connectedWallet ? connectedWallet.substring(0, 15) + '...' : ''} is not authorized as admin`);
      } else {
        setError(errorDetail);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchWallet = () => {
    setAccessDenied(false);
    setError('');
    setConnectedWallet(null);
    handleWalletLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[url('/background.jpg')] bg-no-repeat bg-contain bg-top opacity-25 md:bg-cover md:bg-right"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-black/80 border-amber-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-black" />
            </div>
            <CardTitle className="text-3xl text-amber-400">Admin Access</CardTitle>
            <CardDescription className="text-gray-300">
              Connect your XRPL wallet to authenticate as admin
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className={`mb-4 ${accessDenied ? 'bg-red-900/50 border-red-500' : 'bg-blue-900/50 border-blue-500'}`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {!accessDenied ? (
                <>
                  <Button
                    type="button"
                    onClick={handleWalletLogin}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Connect Wallet
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-gray-400 text-center">
                    Only authorized admin wallets can access the dashboard
                  </p>
                </>
              ) : (
                <>
                  <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-center">
                    <p className="text-red-400 font-semibold mb-2">Access Denied</p>
                    <p className="text-sm text-gray-300 mb-4">
                      Your wallet is not authorized as an admin
                    </p>
                    {connectedWallet && (
                      <p className="text-xs text-gray-400 font-mono mb-4">
                        {connectedWallet}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleSwitchWallet}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Different Wallet
                  </Button>
                </>
              )}
            </div>

            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={() => navigate('/')}
                className="text-amber-400 hover:text-amber-300"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
