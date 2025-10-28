from sqlalchemy import Column, String, Integer, DateTime, Boolean, Enum, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
import enum

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class WhitelistEntryDB(Base):
    __tablename__ = "whitelist_entries"
    
    id = Column(String, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=False, index=True)
    wallet_address = Column(String, nullable=False, unique=True, index=True)
    street_address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    state_province = Column(String, nullable=False)
    zip_postal = Column(String, nullable=False)
    country = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class NFTCollectionDB(Base):
    __tablename__ = "nft_collections"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    issuer = Column(String, nullable=False, index=True)
    taxon = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class AdminRole(enum.Enum):
    super_admin = "super_admin"
    admin = "admin"

class AdminWalletDB(Base):
    __tablename__ = "admin_wallets"
    
    id = Column(String, primary_key=True, index=True)
    wallet_address = Column(String, nullable=False, unique=True, index=True)
    role = Column(Enum(AdminRole), nullable=False, default=AdminRole.admin)
    added_by = Column(String, nullable=True)  # wallet address of admin who added this
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class AuthChallengeDB(Base):
    __tablename__ = "auth_challenges"
    
    id = Column(String, primary_key=True, index=True)  # challenge_id (UUID)
    wallet_address = Column(String, nullable=False, index=True)
    nonce = Column(String, nullable=False)  # UUID
    message = Column(String, nullable=False)  # The full challenge message
    expires_at = Column(DateTime, nullable=False, index=True)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    from sqlalchemy.orm import Session
    db = SessionLocal()
    try:
        super_admin_wallet = os.getenv("SUPER_ADMIN_WALLET", "rKhHA3suVVRtJpUQE5vZntyMTWvd9hBxg1")
        existing = db.query(AdminWalletDB).filter(AdminWalletDB.wallet_address == super_admin_wallet).first()
        if not existing:
            import uuid
            admin = AdminWalletDB(
                id=str(uuid.uuid4()),
                wallet_address=super_admin_wallet,
                role=AdminRole.super_admin,
                added_by=None
            )
            db.add(admin)
            db.commit()
            print(f"✅ Bootstrapped super admin wallet: {super_admin_wallet}")
    finally:
        db.close()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
