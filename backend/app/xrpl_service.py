from xrpl.clients import JsonRpcClient
from xrpl.models.requests import AccountNFTs
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

XRPL_CLIENT_URL = "https://xrplcluster.com"

class XRPLService:
    def __init__(self):
        self.client = JsonRpcClient(XRPL_CLIENT_URL)
    
    async def get_account_nfts(self, wallet_address: str) -> List[Dict[str, Any]]:
        try:
            request = AccountNFTs(account=wallet_address)
            response = self.client.request(request)
            
            if response.is_successful():
                nfts = response.result.get("account_nfts", [])
                return nfts
            else:
                logger.error(f"Failed to fetch NFTs for {wallet_address}: {response}")
                return []
        except Exception as e:
            logger.error(f"Error fetching NFTs for {wallet_address}: {str(e)}")
            return []
    
    async def verify_nft_ownership(self, wallet_address: str, tracked_collections: List[Dict[str, Any]]) -> Dict[str, Any]:
        nfts = await self.get_account_nfts(wallet_address)
        
        owned_nfts = []
        for nft in nfts:
            issuer = nft.get("Issuer", "")
            taxon = nft.get("NFTokenTaxon")
            
            for collection in tracked_collections:
                collection_issuer = collection.get("issuer", "")
                collection_taxon = collection.get("taxon")
                
                if issuer == collection_issuer:
                    if collection_taxon is None or taxon == collection_taxon:
                        owned_nfts.append({
                            "nft_id": nft.get("NFTokenID"),
                            "issuer": issuer,
                            "taxon": taxon,
                            "uri": nft.get("URI", ""),
                            "collection_name": collection.get("name", "Unknown"),
                            "flags": nft.get("Flags", 0)
                        })
                        break
        
        return {
            "wallet_address": wallet_address,
            "total_nfts": len(nfts),
            "tracked_nfts": owned_nfts,
            "has_tracked_nfts": len(owned_nfts) > 0
        }

xrpl_service = XRPLService()
