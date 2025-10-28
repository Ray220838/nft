from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from datetime import timedelta
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
import json
import uuid
import os

from app.models import (
    WhitelistEntry, WhitelistCreate, NFTCollection, NFTCollectionCreate,
    Token, NFTVerifyRequest
)
from app.db_models import init_db, get_db, WhitelistEntryDB, NFTCollectionDB, AdminWalletDB, AdminRole
from app.auth import create_access_token, verify_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.xrpl_service import xrpl_service
from app.wallet_auth import (
    create_challenge, verify_challenge, is_super_admin,
    add_admin_wallet, remove_admin_wallet
)
from pydantic import BaseModel

class ChallengeRequest(BaseModel):
    wallet_address: str

class VerifyRequest(BaseModel):
    challenge_id: str
    wallet_address: str
    signature: str
    public_key: str

class AddAdminRequest(BaseModel):
    wallet_address: str
    role: str

class AdminWalletResponse(BaseModel):
    id: str
    wallet_address: str
    role: str
    added_by: str | None
    created_at: str

app = FastAPI(title="XRPL NFT Whitelist API")

@app.on_event("startup")
async def startup_event():
    init_db()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/whitelist", response_model=WhitelistEntry)
async def create_whitelist_entry(entry: WhitelistCreate, db: Session = Depends(get_db)):
    try:
        entry_id = str(uuid.uuid4())
        db_entry = WhitelistEntryDB(
            id=entry_id,
            full_name=entry.full_name,
            email=entry.email,
            wallet_address=entry.wallet_address,
            street_address=entry.street_address,
            city=entry.city,
            state_province=entry.state_province,
            zip_postal=entry.zip_postal,
            country=entry.country,
            phone_number=entry.phone_number
        )
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        
        return WhitelistEntry(
            id=db_entry.id,
            full_name=db_entry.full_name,
            email=db_entry.email,
            wallet_address=db_entry.wallet_address,
            street_address=db_entry.street_address,
            city=db_entry.city,
            state_province=db_entry.state_province,
            zip_postal=db_entry.zip_postal,
            country=db_entry.country,
            phone_number=db_entry.phone_number,
            created_at=db_entry.created_at
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Wallet address already registered")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/whitelist", response_model=List[WhitelistEntry])
async def get_whitelist_entries(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    entries = db.query(WhitelistEntryDB).order_by(WhitelistEntryDB.created_at.desc()).all()
    return [WhitelistEntry(
        id=e.id,
        full_name=e.full_name,
        email=e.email,
        wallet_address=e.wallet_address,
        street_address=e.street_address,
        city=e.city,
        state_province=e.state_province,
        zip_postal=e.zip_postal,
        country=e.country,
        phone_number=e.phone_number,
        created_at=e.created_at
    ) for e in entries]

@app.post("/api/auth/challenge")
async def request_challenge(request: ChallengeRequest, db: Session = Depends(get_db)):
    """Request an authentication challenge for wallet-based login"""
    challenge = create_challenge(db, request.wallet_address)
    return challenge

@app.post("/api/auth/verify", response_model=Token)
async def verify_wallet_signature(request: VerifyRequest, db: Session = Depends(get_db)):
    """Verify wallet signature and issue JWT token"""
    admin_wallet = verify_challenge(
        db,
        request.challenge_id,
        request.wallet_address,
        request.signature,
        request.public_key
    )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": admin_wallet.wallet_address,
            "role": admin_wallet.role.value
        },
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/admin/wallets", response_model=List[AdminWalletResponse])
async def get_admin_wallets(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    """Get all admin wallets (super admin only)"""
    if not is_super_admin(db, username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can view admin wallets"
        )
    
    admins = db.query(AdminWalletDB).order_by(AdminWalletDB.created_at.desc()).all()
    return [AdminWalletResponse(
        id=a.id,
        wallet_address=a.wallet_address,
        role=a.role.value,
        added_by=a.added_by,
        created_at=a.created_at.isoformat()
    ) for a in admins]

@app.post("/api/admin/wallets", response_model=AdminWalletResponse)
async def add_admin(request: AddAdminRequest, username: str = Depends(verify_token), db: Session = Depends(get_db)):
    """Add a new admin wallet (super admin only)"""
    if not is_super_admin(db, username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can add admin wallets"
        )
    
    try:
        role = AdminRole[request.role]
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {[r.value for r in AdminRole]}"
        )
    
    admin = add_admin_wallet(db, request.wallet_address, role, username)
    return AdminWalletResponse(
        id=admin.id,
        wallet_address=admin.wallet_address,
        role=admin.role.value,
        added_by=admin.added_by,
        created_at=admin.created_at.isoformat()
    )

@app.delete("/api/admin/wallets/{wallet_address}")
async def remove_admin(wallet_address: str, username: str = Depends(verify_token), db: Session = Depends(get_db)):
    """Remove an admin wallet (super admin only)"""
    if not is_super_admin(db, username):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can remove admin wallets"
        )
    
    remove_admin_wallet(db, wallet_address, username)
    return {"message": "Admin wallet removed successfully"}

@app.get("/api/admin/download/json")
async def download_whitelist_json(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    entries = db.query(WhitelistEntryDB).order_by(WhitelistEntryDB.created_at.desc()).all()
    entries_dict = [{
        'id': e.id,
        'full_name': e.full_name,
        'email': e.email,
        'wallet_address': e.wallet_address,
        'street_address': e.street_address,
        'city': e.city,
        'state_province': e.state_province,
        'zip_postal': e.zip_postal,
        'country': e.country,
        'phone_number': e.phone_number,
        'created_at': e.created_at.isoformat()
    } for e in entries]
    
    json_content = json.dumps(entries_dict, indent=2)
    return PlainTextResponse(
        content=json_content,
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=whitelist.json"}
    )

@app.get("/api/admin/download/txt")
async def download_whitelist_txt(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    entries = db.query(WhitelistEntryDB).order_by(WhitelistEntryDB.created_at.desc()).all()
    
    lines = ["XRPL NFT Whitelist Entries\n", "=" * 80 + "\n\n"]
    
    for i, entry in enumerate(entries, 1):
        lines.append(f"Entry #{i}\n")
        lines.append(f"Name: {entry.full_name}\n")
        lines.append(f"Email: {entry.email}\n")
        lines.append(f"Wallet: {entry.wallet_address}\n")
        lines.append(f"Address: {entry.street_address}, {entry.city}, {entry.state_province} {entry.zip_postal}, {entry.country}\n")
        if entry.phone_number:
            lines.append(f"Phone: {entry.phone_number}\n")
        lines.append(f"Registered: {entry.created_at.isoformat()}\n")
        lines.append("-" * 80 + "\n\n")
    
    txt_content = "".join(lines)
    return PlainTextResponse(
        content=txt_content,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=whitelist.txt"}
    )

@app.get("/api/admin/download/addresses")
async def download_wallet_addresses(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    entries = db.query(WhitelistEntryDB).order_by(WhitelistEntryDB.created_at.desc()).all()
    addresses = [entry.wallet_address for entry in entries]
    
    txt_content = "\n".join(addresses)
    return PlainTextResponse(
        content=txt_content,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=wallet_addresses.txt"}
    )

@app.post("/api/collections", response_model=NFTCollection)
async def create_nft_collection(collection: NFTCollectionCreate, username: str = Depends(verify_token), db: Session = Depends(get_db)):
    try:
        collection_id = str(uuid.uuid4())
        db_collection = NFTCollectionDB(
            id=collection_id,
            name=collection.name,
            issuer=collection.issuer,
            taxon=collection.taxon
        )
        db.add(db_collection)
        db.commit()
        db.refresh(db_collection)
        
        return NFTCollection(
            id=db_collection.id,
            name=db_collection.name,
            issuer=db_collection.issuer,
            taxon=db_collection.taxon,
            created_at=db_collection.created_at
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/collections", response_model=List[NFTCollection])
async def get_nft_collections(db: Session = Depends(get_db)):
    collections = db.query(NFTCollectionDB).order_by(NFTCollectionDB.created_at.desc()).all()
    return [NFTCollection(
        id=c.id,
        name=c.name,
        issuer=c.issuer,
        taxon=c.taxon,
        created_at=c.created_at
    ) for c in collections]

@app.delete("/api/collections/{collection_id}")
async def delete_nft_collection(collection_id: str, username: str = Depends(verify_token), db: Session = Depends(get_db)):
    collection = db.query(NFTCollectionDB).filter(NFTCollectionDB.id == collection_id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    db.delete(collection)
    db.commit()
    return {"message": "Collection deleted successfully"}

@app.delete("/api/admin/whitelist")
async def clear_whitelist(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    """Clear all whitelist entries"""
    count = db.query(WhitelistEntryDB).count()
    db.query(WhitelistEntryDB).delete()
    db.commit()
    return {"deleted": count, "message": f"Cleared {count} whitelist entries"}

@app.delete("/api/admin/collections")
async def clear_collections(username: str = Depends(verify_token), db: Session = Depends(get_db)):
    """Clear all NFT collections"""
    count = db.query(NFTCollectionDB).count()
    db.query(NFTCollectionDB).delete()
    db.commit()
    return {"deleted": count, "message": f"Cleared {count} NFT collections"}

@app.post("/api/nfts/verify")
async def verify_nft_ownership(request: NFTVerifyRequest, db: Session = Depends(get_db)):
    try:
        collections = db.query(NFTCollectionDB).all()
        collections_dict = [
            {
                "name": col.name,
                "issuer": col.issuer,
                "taxon": col.taxon
            }
            for col in collections
        ]
        
        result = await xrpl_service.verify_nft_ownership(
            request.wallet_address,
            collections_dict
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend_dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="static")
