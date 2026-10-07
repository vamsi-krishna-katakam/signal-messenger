from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from database import get_db
from models import User, Conversation, ConversationParticipant, Message, MessageReceipt
from schemas import ConversationResponse, ParticipantResponse, MessageResponse, UserResponse
from auth import get_current_user

router = APIRouter(prefix="/api/conversations", tags=["Conversations"])


def format_conversation_response(
    conv: Conversation, current_user_id: str, db: Session
) -> ConversationResponse:
    """Helper to convert ORM Conversation model to typed ConversationResponse JSON schema."""
    participants = []
    other_user = None

    for p in conv.participants:
        user_resp = UserResponse.model_validate(p.user)
        participants.append(ParticipantResponse(user_id=p.user_id, role=p.role, user=user_resp))
        if p.user_id != current_user_id:
            other_user = p.user

    # Compute chat title and avatar
    title = conv.title
    avatar_url = conv.avatar_url
    if conv.type == "direct" and other_user:
        title = other_user.display_name
        avatar_url = other_user.avatar_url

    # Fetch last message
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(desc(Message.created_at))
        .first()
    )
    last_message_resp = None
    if last_msg:
        sender_resp = UserResponse.model_validate(last_msg.sender)
        last_message_resp = MessageResponse(
            id=last_msg.id,
            conversation_id=last_msg.conversation_id,
            sender_id=last_msg.sender_id,
            sender=sender_resp,
            text=last_msg.text,
            created_at=last_msg.created_at,
            receipts=[],
        )

    # Compute unread count for current user
    unread_count = (
        db.query(Message)
        .join(MessageReceipt)
        .filter(
            Message.conversation_id == conv.id,
            MessageReceipt.user_id == current_user_id,
            MessageReceipt.status != "read",
            Message.sender_id != current_user_id,
        )
        .count()
    )

    return ConversationResponse(
        id=conv.id,
        type=conv.type,
        title=title,
        avatar_url=avatar_url,
        created_by_id=conv.created_by_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        participants=participants,
        last_message=last_message_resp,
        unread_count=unread_count,
    )


@router.get("", response_model=List[ConversationResponse])
def get_conversations(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Returns all conversations the user is participating in, ordered by most recent activity."""
    user_participations = (
        db.query(ConversationParticipant)
        .filter(ConversationParticipant.user_id == current_user.id)
        .all()
    )
    conv_ids = [p.conversation_id for p in user_participations]

    conversations = (
        db.query(Conversation)
        .filter(Conversation.id.in_(conv_ids))
        .order_by(desc(Conversation.updated_at))
        .all()
    )

    return [format_conversation_response(c, current_user.id, db) for c in conversations]


@router.post("/direct/{target_user_id}", response_model=ConversationResponse)
def get_or_create_direct_conversation(
    target_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gets an existing 1-on-1 conversation with target user or creates a new one."""
    if target_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start a direct conversation with yourself")

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    # Check if a direct conversation already exists between current_user and target_user
    current_user_convs = (
        db.query(ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id == current_user.id)
        .subquery()
    )

    existing_direct_conv = (
        db.query(Conversation)
        .join(ConversationParticipant)
        .filter(
            Conversation.type == "direct",
            Conversation.id.in_(current_user_convs),
            ConversationParticipant.user_id == target_user_id,
        )
        .first()
    )

    if existing_direct_conv:
        return format_conversation_response(existing_direct_conv, current_user.id, db)

    # Create new direct conversation
    new_conv = Conversation(type="direct", created_by_id=current_user.id)
    db.add(new_conv)
    db.commit()
    db.refresh(new_conv)

    # Add participants
    p1 = ConversationParticipant(conversation_id=new_conv.id, user_id=current_user.id, role="admin")
    p2 = ConversationParticipant(conversation_id=new_conv.id, user_id=target_user_id, role="member")
    db.add_all([p1, p2])
    db.commit()
    db.refresh(new_conv)

    return format_conversation_response(new_conv, current_user.id, db)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation_details(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Gets conversation details by ID."""
    participant = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )

    if not participant:
        raise HTTPException(status_code=403, detail="You are not a member of this conversation")

    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return format_conversation_response(conv, current_user.id, db)
