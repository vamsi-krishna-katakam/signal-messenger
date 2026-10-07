from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import UserResponse, UserUpdateRequest
from auth import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/search", response_model=List[UserResponse])
def search_users(
    query: str = Query(..., min_length=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Searches for registered users by phone number or username (excluding current user)."""
    search_pattern = f"%{query}%"
    users = (
        db.query(User)
        .filter(
            User.id != current_user.id,
            (User.phone_number.ilike(search_pattern))
            | (User.username.ilike(search_pattern))
            | (User.display_name.ilike(search_pattern)),
        )
        .limit(20)
        .all()
    )
    return users


@router.get("/demo-users", response_model=List[UserResponse])
def list_demo_users(db: Session = Depends(get_db)):
    """Returns all registered accounts in the system."""
    users = db.query(User).order_by(User.created_at.asc()).all()
    return users


@router.put("/profile", response_model=UserResponse)
def update_profile(
    request: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Updates user display name, avatar, or bio."""
    if request.display_name is not None:
        current_user.display_name = request.display_name
    if request.avatar_url is not None:
        current_user.avatar_url = request.avatar_url
    if request.bio is not None:
        current_user.bio = request.bio

    db.commit()
    db.refresh(current_user)
    return current_user
