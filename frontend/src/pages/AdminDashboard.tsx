import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, LogOut, Plus, Trash2, Users, Package, 
  CheckCircle, AlertCircle, Loader2, Search, Shield 
} from 'lucide-react';
import { apiService, WhitelistEntry, NFTCollection, NFTCollectionCreate, AdminWallet, AddAdminRequest } from '../services/api';

function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'whitelist' | 'collections' | 'admins'>('whitelist');
  const [whitelistEntries, setWhitelistEntries] = useState<WhitelistEntry[]>([]);
  const [nftCollections, setNftCollections] = useState<NFTCollection[]>([]);
  const [adminWallets, setAdminWallets] = useState<AdminWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddCollection, setShowAddCollection] = useState(false);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newCollection, setNewCollection] = useState<NFTCollectionCreate>({
    name: '',
    issuer: '',
    taxon: undefined,
  });
  const [newAdmin, setNewAdmin] = useState<AddAdminRequest>({
    wallet_address: '',
    role: 'admin',
  });

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      localStorage.removeItem('admin_token');
      navigate('/admin/login');
      return;
    }

    const decoded = decodeJWT(token);
    if (!decoded || !decoded.role || !['admin', 'super_admin'].includes(decoded.role)) {
      localStorage.removeItem('admin_token');
      navigate('/admin/login');
      return;
    }

    loadData();
  }, [activeTab, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'whitelist') {
        const response = await apiService.getWhitelistEntries();
        setWhitelistEntries(response.data);
      } else if (activeTab === 'collections') {
        const response = await apiService.getNFTCollections();
        setNftCollections(response.data);
      } else if (activeTab === 'admins') {
        const response = await apiService.getAdminWallets();
        setAdminWallets(response.data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDownloadJSON = async () => {
    try {
      const response = await apiService.downloadWhitelistJSON();
      downloadFile(response.data, 'whitelist.json');
      setMessage({ type: 'success', text: 'Downloaded whitelist as JSON' });
    } catch (error) {
      console.error('Download error:', error);
      setMessage({ type: 'error', text: 'Failed to download JSON' });
    }
  };

  const handleDownloadTXT = async () => {
    try {
      const response = await apiService.downloadWhitelistTXT();
      downloadFile(response.data, 'whitelist.txt');
      setMessage({ type: 'success', text: 'Downloaded whitelist as TXT' });
    } catch (error) {
      console.error('Download error:', error);
      setMessage({ type: 'error', text: 'Failed to download TXT' });
    }
  };

  const handleDownloadAddresses = async () => {
    try {
      const response = await apiService.downloadWalletAddresses();
      downloadFile(response.data, 'wallet_addresses.txt');
      setMessage({ type: 'success', text: 'Downloaded wallet addresses' });
    } catch (error) {
      console.error('Download error:', error);
      setMessage({ type: 'error', text: 'Failed to download addresses' });
    }
  };

  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createNFTCollection(newCollection);
      setMessage({ type: 'success', text: 'NFT collection added successfully' });
      setShowAddCollection(false);
      setNewCollection({ name: '', issuer: '', taxon: undefined });
      loadData();
    } catch (error) {
      console.error('Add collection error:', error);
      setMessage({ type: 'error', text: 'Failed to add NFT collection' });
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    
    try {
      await apiService.deleteNFTCollection(id);
      setMessage({ type: 'success', text: 'Collection deleted successfully' });
      loadData();
    } catch (error) {
      console.error('Delete collection error:', error);
      setMessage({ type: 'error', text: 'Failed to delete collection' });
    }
  };

  const handleClearWhitelist = async () => {
    if (!confirm(`Are you sure you want to clear ALL ${whitelistEntries.length} whitelist entries? This action cannot be undone!`)) return;
    
    try {
      const response = await apiService.clearWhitelist();
      setMessage({ type: 'success', text: response.data.message });
      loadData();
    } catch (error) {
      console.error('Clear whitelist error:', error);
      setMessage({ type: 'error', text: 'Failed to clear whitelist' });
    }
  };

  const handleClearCollections = async () => {
    if (!confirm(`Are you sure you want to clear ALL ${nftCollections.length} NFT collections? This action cannot be undone!`)) return;
    
    try {
      const response = await apiService.clearNFTCollections();
      setMessage({ type: 'success', text: response.data.message });
      loadData();
    } catch (error) {
      console.error('Clear collections error:', error);
      setMessage({ type: 'error', text: 'Failed to clear collections' });
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.addAdminWallet(newAdmin);
      setMessage({ type: 'success', text: 'Admin wallet added successfully' });
      setShowAddAdmin(false);
      setNewAdmin({ wallet_address: '', role: 'admin' });
      loadData();
    } catch (error: any) {
      console.error('Add admin error:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to add admin wallet' });
    }
  };

  const handleRemoveAdmin = async (wallet_address: string) => {
    if (!confirm(`Are you sure you want to remove admin access for ${wallet_address}?`)) return;
    
    try {
      await apiService.removeAdminWallet(wallet_address);
      setMessage({ type: 'success', text: 'Admin wallet removed successfully' });
      loadData();
    } catch (error: any) {
      console.error('Remove admin error:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to remove admin wallet' });
    }
  };

  const filteredEntries = whitelistEntries.filter(entry =>
    entry.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.wallet_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="absolute inset-0 bg-[url('/background.jpg')] bg-no-repeat bg-contain bg-top opacity-25 md:bg-cover md:bg-right"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-600">
            Admin Dashboard
          </h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        {message && (
          <Alert className={`mb-6 ${message.type === 'success' ? 'bg-green-900/50 border-green-500' : 'bg-red-900/50 border-red-500'}`}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setActiveTab('whitelist')}
            className={activeTab === 'whitelist' 
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black' 
              : 'bg-gray-800 text-white hover:bg-gray-700'
            }
          >
            <Users className="mr-2 h-4 w-4" />
            Whitelist Entries
          </Button>
          <Button
            onClick={() => setActiveTab('collections')}
            className={activeTab === 'collections' 
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black' 
              : 'bg-gray-800 text-white hover:bg-gray-700'
            }
          >
            <Package className="mr-2 h-4 w-4" />
            NFT Collections
          </Button>
          <Button
            onClick={() => setActiveTab('admins')}
            className={activeTab === 'admins' 
              ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-black' 
              : 'bg-gray-800 text-white hover:bg-gray-700'
            }
          >
            <Shield className="mr-2 h-4 w-4" />
            Admin Management
          </Button>
        </div>

        {activeTab === 'whitelist' && (
          <Card className="bg-black/80 border-amber-500/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl text-amber-400">Whitelist Entries</CardTitle>
                  <CardDescription className="text-gray-300">
                    Total entries: {whitelistEntries.length}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDownloadJSON}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    JSON
                  </Button>
                  <Button
                    onClick={handleDownloadTXT}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    TXT
                  </Button>
                  <Button
                    onClick={handleDownloadAddresses}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Addresses
                  </Button>
                  <Button
                    onClick={handleClearWhitelist}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={whitelistEntries.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email, or wallet address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No whitelist entries found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-amber-500/30">
                        <th className="text-left p-3 text-amber-400">Name</th>
                        <th className="text-left p-3 text-amber-400">Email</th>
                        <th className="text-left p-3 text-amber-400">Wallet Address</th>
                        <th className="text-left p-3 text-amber-400">Location</th>
                        <th className="text-left p-3 text-amber-400">Phone</th>
                        <th className="text-left p-3 text-amber-400">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                          <td className="p-3 text-white">{entry.full_name}</td>
                          <td className="p-3 text-gray-300">{entry.email}</td>
                          <td className="p-3 text-gray-300 font-mono text-sm">{entry.wallet_address.substring(0, 15)}...</td>
                          <td className="p-3 text-gray-300">{entry.city}, {entry.state_province}</td>
                          <td className="p-3 text-gray-300">{entry.phone_number || 'N/A'}</td>
                          <td className="p-3 text-gray-300">{new Date(entry.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'admins' && (
          <Card className="bg-black/80 border-amber-500/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl text-amber-400">Admin Management</CardTitle>
                  <CardDescription className="text-gray-300">
                    Manage admin wallet access (Super Admin Only)
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setShowAddAdmin(!showAddAdmin)}
                  className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Admin
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showAddAdmin && (
                <form onSubmit={handleAddAdmin} className="mb-6 p-4 bg-gray-900/50 border border-amber-500/30 rounded-lg space-y-4">
                  <div>
                    <Label htmlFor="admin_wallet" className="text-amber-400">Wallet Address *</Label>
                    <Input
                      id="admin_wallet"
                      value={newAdmin.wallet_address}
                      onChange={(e) => setNewAdmin({ ...newAdmin, wallet_address: e.target.value })}
                      required
                      pattern="r[a-zA-Z0-9]{24,34}"
                      className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500 font-mono"
                      placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin_role" className="text-amber-400">Role *</Label>
                    <select
                      id="admin_role"
                      value={newAdmin.role}
                      onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                      className="w-full p-2 bg-gray-900/50 border border-amber-500/30 text-white rounded-md"
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Add Admin
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddAdmin(false);
                        setNewAdmin({ wallet_address: '', role: 'admin' });
                      }}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              ) : adminWallets.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No admin wallets found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-amber-500/30">
                        <th className="text-left p-3 text-amber-400">Wallet Address</th>
                        <th className="text-left p-3 text-amber-400">Role</th>
                        <th className="text-left p-3 text-amber-400">Added By</th>
                        <th className="text-left p-3 text-amber-400">Date Added</th>
                        <th className="text-left p-3 text-amber-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminWallets.map((admin) => (
                        <tr key={admin.id} className="border-b border-gray-800 hover:bg-gray-900/50">
                          <td className="p-3 text-white font-mono text-sm">{admin.wallet_address}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              admin.role === 'super_admin' 
                                ? 'bg-purple-900/50 text-purple-300' 
                                : 'bg-blue-900/50 text-blue-300'
                            }`}>
                              {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                            </span>
                          </td>
                          <td className="p-3 text-gray-300 font-mono text-xs">
                            {admin.added_by ? `${admin.added_by.substring(0, 15)}...` : 'Bootstrap'}
                          </td>
                          <td className="p-3 text-gray-300">{new Date(admin.created_at).toLocaleDateString()}</td>
                          <td className="p-3">
                            {admin.role !== 'super_admin' && (
                              <Button
                                onClick={() => handleRemoveAdmin(admin.wallet_address)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-400 hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'collections' && (
          <Card className="bg-black/80 border-amber-500/30 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl text-amber-400">NFT Collections</CardTitle>
                  <CardDescription className="text-gray-300">
                    Manage tracked NFT collections
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowAddCollection(!showAddCollection)}
                    className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Collection
                  </Button>
                  <Button
                    onClick={handleClearCollections}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={nftCollections.length === 0}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showAddCollection && (
                <form onSubmit={handleAddCollection} className="mb-6 p-4 bg-gray-900/50 border border-amber-500/30 rounded-lg space-y-4">
                  <div>
                    <Label htmlFor="collection_name" className="text-amber-400">Collection Name *</Label>
                    <Input
                      id="collection_name"
                      value={newCollection.name}
                      onChange={(e) => setNewCollection({ ...newCollection, name: e.target.value })}
                      required
                      className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                      placeholder="Bearded Ape Society"
                    />
                  </div>
                  <div>
                    <Label htmlFor="collection_issuer" className="text-amber-400">Issuer Address *</Label>
                    <Input
                      id="collection_issuer"
                      value={newCollection.issuer}
                      onChange={(e) => setNewCollection({ ...newCollection, issuer: e.target.value })}
                      required
                      pattern="r[a-zA-Z0-9]{24,34}"
                      className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500 font-mono"
                      placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXX..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="collection_taxon" className="text-amber-400">Taxon (Optional)</Label>
                    <Input
                      id="collection_taxon"
                      type="number"
                      value={newCollection.taxon || ''}
                      onChange={(e) => setNewCollection({ ...newCollection, taxon: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="bg-gray-900/50 border-amber-500/30 text-white placeholder:text-gray-500"
                      placeholder="0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="bg-green-600 hover:bg-green-700">
                      Add Collection
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowAddCollection(false);
                        setNewCollection({ name: '', issuer: '', taxon: undefined });
                      }}
                      className="bg-gray-600 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                </div>
              ) : nftCollections.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No NFT collections added yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {nftCollections.map((collection) => (
                    <div key={collection.id} className="p-4 bg-gray-900/50 border border-amber-500/30 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-amber-400">{collection.name}</h3>
                        <Button
                          onClick={() => handleDeleteCollection(collection.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 font-mono mb-1">
                        Issuer: {collection.issuer.substring(0, 20)}...
                      </p>
                      {collection.taxon !== null && collection.taxon !== undefined && (
                        <p className="text-xs text-gray-400">Taxon: {collection.taxon}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Added: {new Date(collection.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
