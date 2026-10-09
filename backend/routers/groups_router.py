from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import User, Conversation, ConversationParticipant, Message, MessageReceipt
from schemas import GroupCreateRequest, GroupMemberAddRequest, ConversationResponse
from routers.conversations_router import format_conversation_response
from auth import get_current_user

router = APIRouter(prefix="/api/groups", tags=["Groups"])


@router.post("/create", response_model=ConversationResponse)
def create_group(
    request: GroupCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new group conversation with title and selected members."""
    if not request.title.strip():
        raise HTTPException(status_code=400, detail="Group title cannot be empty")

    now = datetime.now(timezone.utc)
    new_group = Conversation(
        type="group",
        title=request.title.strip(),
        avatar_url=request.avatar_url,
        created_by_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(new_group)
    db.commit()
    db.refresh(new_group)

    # Add creator as Admin
    participants = [
        ConversationParticipant(
            conversation_id=new_group.id, user_id=current_user.id, role="admin", joined_at=now
        )
    ]

    # Deduplicate member user IDs
    member_ids = set(request.member_user_ids) - {current_user.id}
    for m_id in member_ids:
        # Verify user exists
        member_user = db.query(User).filter(User.id == m_id).first()
        if member_user:
            participants.append(
                ConversationParticipant(
                    conversation_id=new_group.id, user_id=m_id, role="member", joined_at=now
                )
            )

    db.add_all(participants)
    db.commit()

    # Create system notification message for group creation
    sys_msg = Message(
        conversation_id=new_group.id,
        sender_id=current_user.id,
        text=f"📌 {current_user.display_name} created group \"{new_group.title}\"",
        created_at=now,
    )
    db.add(sys_msg)
    db.commit()
    db.refresh(sys_msg)

    receipts = [
        MessageReceipt(
            message_id=sys_msg.id,
            user_id=p.user_id,
            status="read" if p.user_id == current_user.id else "delivered",
        )
        for p in participants
    ]
    db.add_all(receipts)
    db.commit()

    db.refresh(new_group)

    return format_conversation_response(new_group, current_user.id, db)


@router.post("/{group_id}/members", response_model=ConversationResponse)
def add_group_members(
    group_id: str,
    request: GroupMemberAddRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Adds members to an existing group (Admin or Member control)."""
    group = (
        db.query(Conversation)
        .filter(Conversation.id == group_id, Conversation.type == "group")
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group conversation not found")

    # Check requester participation
    requester_part = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == group_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not requester_part:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    now = datetime.now(timezone.utc)
    existing_part_user_ids = {p.user_id for p in group.participants}

    new_parts = []
    added_names = []
    for uid in request.user_ids:
        if uid not in existing_part_user_ids:
            user = db.query(User).filter(User.id == uid).first()
            if user:
                new_parts.append(
                    ConversationParticipant(
                        conversation_id=group_id, user_id=uid, role="member", joined_at=now
                    )
                )
                added_names.append(user.display_name)

    if new_parts:
        group.updated_at = now
        db.add_all(new_parts)
        db.commit()

        # Add system notification message
        names_str = ", ".join(added_names)
        sys_msg = Message(
            conversation_id=group.id,
            sender_id=current_user.id,
            text=f"📌 {current_user.display_name} added {names_str} to the group",
            created_at=now,
        )
        db.add(sys_msg)
        db.commit()
        db.refresh(sys_msg)

        receipts = [
            MessageReceipt(
                message_id=sys_msg.id,
                user_id=p.user_id,
                status="read" if p.user_id == current_user.id else "delivered",
            )
            for p in group.participants
        ]
        db.add_all(receipts)
        db.commit()

        db.refresh(group)

    return format_conversation_response(group, current_user.id, db)


@router.delete("/{group_id}/members/{target_user_id}", response_model=ConversationResponse)
def remove_group_member(
    group_id: str,
    target_user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Removes a member from a group (Admin control or self-leave)."""
    group = (
        db.query(Conversation)
        .filter(Conversation.id == group_id, Conversation.type == "group")
        .first()
    )
    if not group:
        raise HTTPException(status_code=404, detail="Group conversation not found")

    requester_part = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == group_id,
            ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )
    if not requester_part:
        raise HTTPException(status_code=403, detail="You are not a member of this group")

    # Admin control check: non-admins can only remove themselves (leave group)
    if requester_part.role != "admin" and current_user.id != target_user_id:
        raise HTTPException(
            status_code=403, detail="Only group admins can remove other members"
        )

    target_part = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == group_id,
            ConversationParticipant.user_id == target_user_id,
        )
        .first()
    )
    if not target_part:
        raise HTTPException(status_code=404, detail="Member not found in group")

    target_name = target_part.user.display_name if target_part.user else "A member"
    if current_user.id == target_user_id:
        sys_text = f"📌 {target_name} left the group"
    else:
        sys_text = f"📌 {current_user.display_name} removed {target_name} from the group"

    now = datetime.now(timezone.utc)
    group.updated_at = now
    db.delete(target_part)
    db.commit()

    sys_msg = Message(
        conversation_id=group.id,
        sender_id=current_user.id,
        text=sys_text,
        created_at=now,
    )
    db.add(sys_msg)
    db.commit()
    db.refresh(sys_msg)

    receipts = [
        MessageReceipt(
            message_id=sys_msg.id,
            user_id=p.user_id,
            status="read" if p.user_id == current_user.id else "delivered",
        )
        for p in group.participants
    ]
    db.add_all(receipts)
    db.commit()

    db.refresh(group)

    return format_conversation_response(group, current_user.id, db)

