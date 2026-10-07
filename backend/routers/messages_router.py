from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from models import User, ConversationParticipant, Message, MessageReceipt
from schemas import MessageResponse, UserResponse, MessageReceiptResponse
from auth import get_current_user

router = APIRouter(prefix="/api/messages", tags=["Messages"])


@router.get("/conversation/{conversation_id}", response_model=List[MessageResponse])
def get_messages(
    conversation_id: str,
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetches message history for a conversation."""
    # Verify participation
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )

    if not participant:
        raise HTTPException(status_code=403, detail="Not authorized to access messages in this chat")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id, Message.is_deleted == False)
        .order_by(Message.created_at.asc())
        .limit(limit)
        .all()
    )

    result = []
    for msg in messages:
        sender_resp = UserResponse.model_validate(msg.sender)
        receipt_resps = [
            MessageReceiptResponse(user_id=r.user_id, status=r.status, updated_at=r.updated_at)
            for r in msg.receipts
        ]
        result.append(
            MessageResponse(
                id=msg.id,
                conversation_id=msg.conversation_id,
                sender_id=msg.sender_id,
                sender=sender_resp,
                text=msg.text,
                created_at=msg.created_at,
                receipts=receipt_resps,
            )
        )

    return result


@router.post("/read/{conversation_id}")
def mark_messages_read(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Marks all unread messages in a conversation as read for the current user."""
    unread_receipts = (
        db.query(MessageReceipt)
        .join(Message)
        .filter(
            Message.conversation_id == conversation_id,
            MessageReceipt.user_id == current_user.id,
            MessageReceipt.status != "read",
            Message.sender_id != current_user.id,
        )
        .all()
    )

    now = datetime.now(timezone.utc)
    for receipt in unread_receipts:
        receipt.status = "read"
        receipt.updated_at = now

    db.commit()
    return {"message": "Messages marked as read", "count": len(unread_receipts)}
