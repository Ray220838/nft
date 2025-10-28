import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface WhitelistEntry {
  id: string;
  full_name: string;
  email: string;
  wallet_address: string;
  street_address: string;
  city: string;
  state_province: string;
  zip_postal: string;
  country: string;
  phone_number?: string;
  created_at: string;
}

export interface WhitelistCreate {
  full_name: string;
  email: string;
  wallet_address: string;
  street_address: string;
  city: string;
  state_province: string;
  zip_postal: string;
  country: string;
  phone_number?: string;
}

export interface NFTCollection {
  id: string;
  name: string;
  issuer: string;
  taxon?: number;
  created_at: string;
}

export interface NFTCollectionCreate {
  name: string;
  issuer: string;
  taxon?: number;
}

export interface AdminLogin {
  username: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface NFTVerifyResponse {
  wallet_address: string;
  total_nfts: number;
  tracked_nfts: Array<{
    nft_id: string;
    issuer: string;
    taxon: number;
    uri: string;
    collection_name: string;
    flags: number;
  }>;
  has_tracked_nfts: boolean;
}

export interface ChallengeRequest {
  wallet_address: string;
}

export interface ChallengeResponse {
  challenge_id: string;
  message: string;
  expires_at: string;
}

export interface VerifyRequest {
  challenge_id: string;
  wallet_address: string;
  signature: string;
  public_key: string;
}

export interface AdminWallet {
  id: string;
  wallet_address: string;
  role: string;
  added_by: string | null;
  created_at: string;
}

export interface AddAdminRequest {
  wallet_address: string;
  role: string;
}

export const apiService = {
  createWhitelistEntry: (data: WhitelistCreate) =>
    api.post<WhitelistEntry>('/api/whitelist', data),

  getWhitelistEntries: () =>
    api.get<WhitelistEntry[]>('/api/whitelist'),

  adminLogin: (credentials: AdminLogin) =>
    api.post<Token>('/api/admin/login', credentials),

  requestChallenge: (data: ChallengeRequest) =>
    api.post<ChallengeResponse>('/api/auth/challenge', data),

  verifySignature: (data: VerifyRequest) =>
    api.post<Token>('/api/auth/verify', data),

  getAdminWallets: () =>
    api.get<AdminWallet[]>('/api/admin/wallets'),

  addAdminWallet: (data: AddAdminRequest) =>
    api.post<AdminWallet>('/api/admin/wallets', data),

  removeAdminWallet: (wallet_address: string) =>
    api.delete(`/api/admin/wallets/${wallet_address}`),

  downloadWhitelistJSON: () =>
    api.get('/api/admin/download/json', { responseType: 'blob' }),

  downloadWhitelistTXT: () =>
    api.get('/api/admin/download/txt', { responseType: 'blob' }),

  downloadWalletAddresses: () =>
    api.get('/api/admin/download/addresses', { responseType: 'blob' }),

  createNFTCollection: (data: NFTCollectionCreate) =>
    api.post<NFTCollection>('/api/collections', data),

  getNFTCollections: () =>
    api.get<NFTCollection[]>('/api/collections'),

  deleteNFTCollection: (id: string) =>
    api.delete(`/api/collections/${id}`),

  clearWhitelist: () =>
    api.delete<{ deleted: number; message: string }>('/api/admin/whitelist'),

  clearNFTCollections: () =>
    api.delete<{ deleted: number; message: string }>('/api/admin/collections'),

  verifyNFTOwnership: (wallet_address: string) =>
    api.post<NFTVerifyResponse>('/api/nfts/verify', { wallet_address }),
};

export default api;
