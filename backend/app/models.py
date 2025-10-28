from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class WhitelistEntry(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    wallet_address: str
    street_address: str
    city: str
    state_province: str
    zip_postal: str
    country: str
    phone_number: Optional[str] = None
    created_at: datetime

class WhitelistCreate(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: EmailStr
    wallet_address: str = Field(..., pattern=r'^r[a-zA-Z0-9]{24,34}$')
    street_address: str = Field(..., min_length=1)
    city: str = Field(..., min_length=1)
    state_province: str = Field(..., min_length=1)
    zip_postal: str = Field(..., min_length=1)
    country: str = Field(..., min_length=1)
    phone_number: Optional[str] = None

class NFTCollection(BaseModel):
    id: str
    name: str
    issuer: str
    taxon: Optional[int] = None
    created_at: datetime

class NFTCollectionCreate(BaseModel):
    name: str = Field(..., min_length=1)
    issuer: str = Field(..., pattern=r'^r[a-zA-Z0-9]{24,34}$')
    taxon: Optional[int] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class NFTVerifyRequest(BaseModel):
    wallet_address: str = Field(..., pattern=r'^r[a-zA-Z0-9]{24,34}$')
