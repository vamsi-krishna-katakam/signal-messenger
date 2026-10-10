from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import User
from schemas import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from auth import get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=TokenResponse)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Registers a new user with first name, last name, unique phone number, unique username, and OTP ('123456')."""
    if request.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP code (Use '123456')")

    # Check if phone number already exists
    existing_phone = db.query(User).filter(User.phone_number == request.phone_number.strip()).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Mobile number already registered")

    # Check if username already exists
    existing_user = db.query(User).filter(User.username == request.username.strip()).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    display_name = f"{request.first_name.strip()} {request.last_name.strip()}".strip()
    pwd = request.password or "signal_pass"

    # Create new user
    new_user = User(
        phone_number=request.phone_number.strip(),
        username=request.username.strip(),
        display_name=display_name,
        avatar_url=request.avatar_url,
        hashed_password=get_password_hash(pwd),
        is_online=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Issue JWT Token
    access_token = create_access_token(data={"sub": new_user.id})
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(new_user))


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Logs in an existing user via phone number or username using OTP verification ('123456')."""
    # Accept any login identifier (phone or username)
    user = (
        db.query(User)
        .filter((User.phone_number == request.login.strip()) | (User.username == request.login.strip()))
        .first()
    )

    if not user:
        raise HTTPException(status_code=400, detail="User not found with provided phone/username")

    # Verify OTP
    if request.otp != "123456":
        raise HTTPException(status_code=400, detail="Invalid OTP code (Use '123456')")

    # Update online status
    user.is_online = True
    db.commit()
    db.refresh(user)

    # Issue JWT Token
    access_token = create_access_token(data={"sub": user.id})
    return TokenResponse(access_token=access_token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Returns profile info for currently logged in user."""
    return current_user


from datetime import datetime, timezone
from websocket_manager import manager

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Logs out user and updates online status."""
    current_user.is_online = False
    current_user.last_seen = datetime.now(timezone.utc)
    db.commit()

    all_connected_users = list(manager.active_connections.keys())
    await manager.broadcast_to_users(
        all_connected_users,
        {
            "type": "user:status",
            "payload": {
                "user_id": current_user.id,
                "is_online": False,
            },
        },
    )
    return {"message": "Successfully logged out"}
