from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# --- Auth Schemas ---
class RegisterRequest(BaseModel):
    first_name: str
    last_name: str
    phone_number: str
    username: str
    password: Optional[str] = None
    otp: str = "123456"
    avatar_url: Optional[str] = None


class LoginRequest(BaseModel):
    login: str  # Can be phone_number or username
    password: Optional[str] = None
    otp: str = "123456"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# --- User Schemas ---
class UserResponse(BaseModel):
    id: str
    phone_number: str
    username: str
    display_name: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_online: bool
    last_seen: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


# --- Contact Schemas ---
class ContactAddRequest(BaseModel):
    phone_or_username: str
    nickname: Optional[str] = None


class ContactResponse(BaseModel):
    id: str
    user_id: str
    contact_user: UserResponse
    nickname: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# --- Message Schemas ---
class MessageCreateRequest(BaseModel):
    conversation_id: str
    text: str


class MessageReceiptResponse(BaseModel):
    user_id: str
    status: str
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    sender: UserResponse
    text: str
    created_at: datetime
    receipts: List[MessageReceiptResponse] = []

    class Config:
        from_attributes = True


# --- Participant Schema ---
class ParticipantResponse(BaseModel):
    user_id: str
    role: str
    user: UserResponse

    class Config:
        from_attributes = True


# --- Conversation Schemas ---
class ConversationResponse(BaseModel):
    id: str
    type: str  # "direct" or "group"
    title: Optional[str] = None
    avatar_url: Optional[str] = None
    created_by_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    participants: List[ParticipantResponse] = []
    last_message: Optional[MessageResponse] = None
    unread_count: int = 0

    class Config:
        from_attributes = True


class GroupCreateRequest(BaseModel):
    title: str
    member_user_ids: List[str]
    avatar_url: Optional[str] = None


class GroupMemberAddRequest(BaseModel):
    user_ids: List[str]
