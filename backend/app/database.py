from typing import Dict, List
from datetime import datetime
import uuid
from app.models import WhitelistEntry, WhitelistCreate, NFTCollection, NFTCollectionCreate

class InMemoryDatabase:
    def __init__(self):
        self.whitelist_entries: Dict[str, WhitelistEntry] = {}
        self.nft_collections: Dict[str, NFTCollection] = {}
    
    def add_whitelist_entry(self, entry: WhitelistCreate) -> WhitelistEntry:
        entry_id = str(uuid.uuid4())
        whitelist_entry = WhitelistEntry(
            id=entry_id,
            full_name=entry.full_name,
            email=entry.email,
            wallet_address=entry.wallet_address,
            street_address=entry.street_address,
            city=entry.city,
            state_province=entry.state_province,
            zip_postal=entry.zip_postal,
            country=entry.country,
            phone_number=entry.phone_number,
            created_at=datetime.utcnow()
        )
        self.whitelist_entries[entry_id] = whitelist_entry
        return whitelist_entry
    
    def get_all_whitelist_entries(self) -> List[WhitelistEntry]:
        return list(self.whitelist_entries.values())
    
    def add_nft_collection(self, collection: NFTCollectionCreate) -> NFTCollection:
        collection_id = str(uuid.uuid4())
        nft_collection = NFTCollection(
            id=collection_id,
            name=collection.name,
            issuer=collection.issuer,
            taxon=collection.taxon,
            created_at=datetime.utcnow()
        )
        self.nft_collections[collection_id] = nft_collection
        return nft_collection
    
    def get_all_nft_collections(self) -> List[NFTCollection]:
        return list(self.nft_collections.values())
    
    def delete_nft_collection(self, collection_id: str) -> bool:
        if collection_id in self.nft_collections:
            del self.nft_collections[collection_id]
            return True
        return False

db = InMemoryDatabase()
