import json
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, status
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt, JWTError

from database import engine, Base, SessionLocal
from models import User, Conversation, ConversationParticipant, Message, MessageReceipt
from schemas import MessageResponse, UserResponse, MessageReceiptResponse
from websocket_manager import manager
from auth import SECRET_KEY, ALGORITHM

# Routers
from routers.auth_router import router as auth_router
from routers.users_router import router as users_router
from routers.contacts_router import router as contacts_router
from routers.conversations_router import router as conversations_router
from routers.messages_router import router as messages_router
from routers.groups_router import router as groups_router

# Initialize FastAPI App
app = FastAPI(
    title="Signal Messenger API",
    description="Production-grade real-time messaging platform backend powered by FastAPI, SQLite, and WebSockets.",
    version="1.0.0",
)

# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-create tables in PostgreSQL / SQLite on app startup
@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)

# Register REST Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(contacts_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(groups_router)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "app": "Signal Messenger API",
        "version": "1.0.1",
        "database": "persistent",
    }


# --- REAL-TIME WEBSOCKET ENDPOINT ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    """Central WebSocket connection for real-time messaging, typing indicators, and receipts."""
    # 1. Authenticate user from JWT query token
    db = SessionLocal()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        user.is_online = True
        db.commit()
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    finally:
        db.close()

    # 2. Register connection with ConnectionManager
    await manager.connect(user_id, websocket)

    # 3. Broadcast live user:status online event to all connected users
    all_connected_users = list(manager.active_connections.keys())
    await manager.broadcast_to_users(
        all_connected_users,
        {
            "type": "user:status",
            "payload": {
                "user_id": user_id,
                "is_online": True,
            },
        },
    )

    try:
        while True:
            # Receive raw text message from WebSocket client
            data_text = await websocket.receive_text()
            data = json.loads(data_text)
            event_type = data.get("type")
            payload_data = data.get("payload", {})

            # EVENT: Send Message
            if event_type == "message:send":
                conv_id = payload_data.get("conversation_id")
                text = payload_data.get("text", "").strip()

                if not conv_id or not text:
                    continue

                now = datetime.now(timezone.utc)

                with SessionLocal() as db_session:
                    # Save new message
                    new_msg = Message(
                        conversation_id=conv_id,
                        sender_id=user_id,
                        text=text,
                        created_at=now,
                    )
                    db_session.add(new_msg)
                    db_session.commit()
                    db_session.refresh(new_msg)

                    # Update conversation updated_at timestamp
                    conv = db_session.query(Conversation).filter(Conversation.id == conv_id).first()
                    if conv:
                        conv.updated_at = now
                        db_session.commit()

                    # Get conversation participants
                    participants = (
                        db_session.query(ConversationParticipant)
                        .filter(ConversationParticipant.conversation_id == conv_id)
                        .all()
                    )
                    participant_user_ids = [p.user_id for p in participants]

                    # Create message receipts for recipient users
                    receipt_resps = []
                    for recipient_id in participant_user_ids:
                        if recipient_id != user_id:
                            is_online = manager.is_user_online(recipient_id)
                            receipt_status = "delivered" if is_online else "sent"
                            receipt = MessageReceipt(
                                message_id=new_msg.id,
                                user_id=recipient_id,
                                status=receipt_status,
                                updated_at=now,
                            )
                            db_session.add(receipt)
                            receipt_resps.append(
                                MessageReceiptResponse(
                                    user_id=recipient_id, status=receipt_status, updated_at=now
                                )
                            )

                    db_session.commit()

                    sender_user = db_session.query(User).filter(User.id == user_id).first()
                    sender_resp = UserResponse.model_validate(sender_user)
                    message_payload = MessageResponse(
                        id=new_msg.id,
                        conversation_id=conv_id,
                        sender_id=user_id,
                        sender=sender_resp,
                        text=text,
                        created_at=now,
                        receipts=receipt_resps,
                    ).model_dump(mode="json")

                # Broadcast to all conversation participants via WebSockets
                await manager.broadcast_to_users(
                    participant_user_ids,
                    {
                        "type": "message:new",
                        "payload": message_payload,
                    },
                )

            # EVENT: Typing Indicators
            elif event_type in ("typing:start", "typing:stop"):
                conv_id = payload_data.get("conversation_id")
                if conv_id:
                    with SessionLocal() as db_session:
                        participants = (
                            db_session.query(ConversationParticipant)
                            .filter(ConversationParticipant.conversation_id == conv_id)
                            .all()
                        )
                        other_user_ids = [p.user_id for p in participants if p.user_id != user_id]

                    await manager.broadcast_to_users(
                        other_user_ids,
                        {
                            "type": "typing:status",
                            "payload": {
                                "conversation_id": conv_id,
                                "user_id": user_id,
                                "is_typing": (event_type == "typing:start"),
                            },
                        },
                    )

            # EVENT: Mark Messages Read
            elif event_type == "message:read":
                conv_id = payload_data.get("conversation_id")
                if conv_id:
                    with SessionLocal() as db_session:
                        unread_receipts = (
                            db_session.query(MessageReceipt)
                            .join(Message)
                            .filter(
                                Message.conversation_id == conv_id,
                                MessageReceipt.user_id == user_id,
                                MessageReceipt.status != "read",
                                Message.sender_id != user_id,
                            )
                            .all()
                        )
                        now = datetime.now(timezone.utc)
                        for r in unread_receipts:
                            r.status = "read"
                            r.updated_at = now
                        db_session.commit()

                        participants = (
                            db_session.query(ConversationParticipant)
                            .filter(ConversationParticipant.conversation_id == conv_id)
                            .all()
                        )
                        other_user_ids = [p.user_id for p in participants if p.user_id != user_id]

                    await manager.broadcast_to_users(
                        other_user_ids,
                        {
                            "type": "message:receipt",
                            "payload": {
                                "conversation_id": conv_id,
                                "user_id": user_id,
                                "status": "read",
                            },
                        },
                    )

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
        if not manager.is_user_online(user_id):
            with SessionLocal() as db_session:
                u = db_session.query(User).filter(User.id == user_id).first()
                if u:
                    u.is_online = False
                    u.last_seen = datetime.now(timezone.utc)
                    db_session.commit()
            all_remaining_users = list(manager.active_connections.keys())
            await manager.broadcast_to_users(
                all_remaining_users,
                {
                    "type": "user:status",
                    "payload": {
                        "user_id": user_id,
                        "is_online": False,
                    },
                },
            )
