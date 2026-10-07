from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Contact
from schemas import ContactAddRequest, ContactResponse
from auth import get_current_user

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])


@router.get("", response_model=List[ContactResponse])
def get_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns the list of contacts for the authenticated user."""
    contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
    return contacts


@router.post("", response_model=ContactResponse)
def add_contact(
    request: ContactAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Adds a new contact by phone number or username."""
    # Find contact target user
    target_user = (
        db.query(User)
        .filter(
            (User.phone_number == request.phone_or_username)
            | (User.username == request.phone_or_username)
        )
        .first()
    )

    if not target_user:
        raise HTTPException(status_code=404, detail="No user found with provided phone or username")

    if target_user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot add yourself as a contact")

    # Check if contact already exists
    existing = (
        db.query(Contact)
        .filter(Contact.user_id == current_user.id, Contact.contact_user_id == target_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Contact already exists in your address book")

    new_contact = Contact(
        user_id=current_user.id,
        contact_user_id=target_user.id,
        nickname=request.nickname or target_user.display_name,
    )
    db.add(new_contact)
    db.commit()
    db.refresh(new_contact)
    return new_contact
