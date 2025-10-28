"""
Wallet-based authentication for XRPL admin access
"""
import uuid
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from xrpl.core.keypairs import verify, derive_classic_address
from .db_models import AdminWalletDB, AuthChallengeDB, AdminRole
import os

CHALLENGE_EXPIRY_MINUTES = 5
DOMAIN = os.getenv("APP_DOMAIN", "nft-wallet-app-9awf3iat.devinapps.com")

def create_challenge(db: Session, wallet_address: str) -> dict:
    """Create a new authentication challenge for a wallet"""
    challenge_id = str(uuid.uuid4())
    nonce = str(uuid.uuid4())
    issued_at = datetime.utcnow()
    expires_at = issued_at + timedelta(minutes=CHALLENGE_EXPIRY_MINUTES)
    
    message = f"""XRPL Sign-In
Domain: {DOMAIN}
Address: {wallet_address}
Nonce: {nonce}
Issued At: {issued_at.isoformat()}Z
Expires At: {expires_at.isoformat()}Z"""
    
    challenge = AuthChallengeDB(
        id=challenge_id,
        wallet_address=wallet_address,
        nonce=nonce,
        message=message,
        expires_at=expires_at,
        used=False
    )
    
    db.add(challenge)
    db.commit()
    
    return {
        "challenge_id": challenge_id,
        "message": message,
        "expires_at": expires_at.isoformat()
    }

def verify_challenge(
    db: Session,
    challenge_id: str,
    wallet_address: str,
    signature: str,
    public_key: str
) -> Optional[AdminWalletDB]:
    """Verify a signed challenge and return admin wallet if valid"""
    
    challenge = db.query(AuthChallengeDB).filter(
        AuthChallengeDB.id == challenge_id
    ).first()
    
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid challenge ID"
        )
    
    if challenge.used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge already used"
        )
    
    if datetime.utcnow() > challenge.expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge expired"
        )
    
    if challenge.wallet_address != wallet_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wallet address mismatch"
        )
    
    try:
        derived_address = derive_classic_address(public_key)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid public key: {str(e)}"
        )
    
    if derived_address != wallet_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public key does not match wallet address"
        )
    
    message_bytes = challenge.message.encode('utf-8')
    
    try:
        is_valid = verify(message_bytes, signature, public_key)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signature verification failed: {str(e)}"
        )
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature"
        )
    
    challenge.used = True
    db.commit()
    
    admin_wallet = db.query(AdminWalletDB).filter(
        AdminWalletDB.wallet_address == wallet_address
    ).first()
    
    if not admin_wallet:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Wallet is not authorized as admin"
        )
    
    return admin_wallet

def is_super_admin(db: Session, wallet_address: str) -> bool:
    """Check if a wallet address is a super admin"""
    admin = db.query(AdminWalletDB).filter(
        AdminWalletDB.wallet_address == wallet_address
    ).first()
    return admin and admin.role == AdminRole.super_admin

def add_admin_wallet(
    db: Session,
    wallet_address: str,
    role: AdminRole,
    added_by: str
) -> AdminWalletDB:
    """Add a new admin wallet"""
    existing = db.query(AdminWalletDB).filter(
        AdminWalletDB.wallet_address == wallet_address
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Wallet is already an admin"
        )
    
    admin = AdminWalletDB(
        id=str(uuid.uuid4()),
        wallet_address=wallet_address,
        role=role,
        added_by=added_by
    )
    
    db.add(admin)
    db.commit()
    db.refresh(admin)
    
    return admin

def remove_admin_wallet(db: Session, wallet_address: str, removed_by: str) -> bool:
    """Remove an admin wallet"""
    admin = db.query(AdminWalletDB).filter(
        AdminWalletDB.wallet_address == wallet_address
    ).first()
    
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin wallet not found"
        )
    
    if admin.role == AdminRole.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove super admin"
        )
    
    db.delete(admin)
    db.commit()
    
    return True
