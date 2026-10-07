from datetime import datetime, timedelta, timezone
from database import engine, Base, SessionLocal
from models import User, Contact, Conversation, ConversationParticipant, Message, MessageReceipt
from auth import get_password_hash


def seed_database():
    """Initializes database tables and optionally populates demo data if SEED_DEMO_DATA=true."""
    import os
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    if os.getenv("SEED_DEMO_DATA", "false").lower() != "true":
        print("Database schema created. Skipping demo data seeding.")
        return

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains user records. Skipping seed.")
            return

        print("Seeding demo users...")
        password_hash = get_password_hash("password123")

        # 1. Create Demo Users
        alice = User(
            phone_number="+15550101",
            username="alice",
            display_name="Alice Walker",
            avatar_url="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
            bio="Building cool software 🚀",
            hashed_password=password_hash,
            is_online=True,
        )
        bob = User(
            phone_number="+15550202",
            username="bob",
            display_name="Bob Smith",
            avatar_url="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
            bio="Backend & WebSockets enthusiast ⚡",
            hashed_password=password_hash,
            is_online=True,
        )
        charlie = User(
            phone_number="+15550303",
            username="charlie",
            display_name="Charlie Davis",
            avatar_url="https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
            bio="Next.js UI & Signal Fanatic 🎨",
            hashed_password=password_hash,
            is_online=False,
        )
        diana = User(
            phone_number="+15550404",
            username="diana",
            display_name="Diana Prince",
            avatar_url="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150",
            bio="Privacy first, encryption always 🔒",
            hashed_password=password_hash,
            is_online=True,
        )

        db.add_all([alice, bob, charlie, diana])
        db.commit()

        # Refresh instances to get generated IDs
        db.refresh(alice)
        db.refresh(bob)
        db.refresh(charlie)
        db.refresh(diana)

        # 2. Add Mutual Contacts
        print("Creating contact connections...")
        contacts = [
            Contact(user_id=alice.id, contact_user_id=bob.id, nickname="Bob"),
            Contact(user_id=alice.id, contact_user_id=charlie.id, nickname="Charlie"),
            Contact(user_id=alice.id, contact_user_id=diana.id, nickname="Diana"),
            Contact(user_id=bob.id, contact_user_id=alice.id, nickname="Alice"),
            Contact(user_id=bob.id, contact_user_id=diana.id, nickname="Diana"),
            Contact(user_id=charlie.id, contact_user_id=alice.id, nickname="Alice"),
            Contact(user_id=diana.id, contact_user_id=alice.id, nickname="Alice"),
            Contact(user_id=diana.id, contact_user_id=bob.id, nickname="Bob"),
        ]
        db.add_all(contacts)
        db.commit()

        # 3. Create 1-on-1 Conversation (Alice & Bob)
        now = datetime.now(timezone.utc)
        print("Creating 1-on-1 conversations...")

        conv_alice_bob = Conversation(
            type="direct",
            created_by_id=alice.id,
            updated_at=now,
        )
        db.add(conv_alice_bob)
        db.commit()
        db.refresh(conv_alice_bob)

        part_ab1 = ConversationParticipant(conversation_id=conv_alice_bob.id, user_id=alice.id, role="admin")
        part_ab2 = ConversationParticipant(conversation_id=conv_alice_bob.id, user_id=bob.id, role="member")
        db.add_all([part_ab1, part_ab2])

        # Messages between Alice & Bob
        msg1 = Message(
            conversation_id=conv_alice_bob.id,
            sender_id=bob.id,
            text="Hey Alice! Did you see the Signal Messenger app?",
            created_at=now - timedelta(minutes=25),
        )
        msg2 = Message(
            conversation_id=conv_alice_bob.id,
            sender_id=alice.id,
            text="Yes! Building it with FastAPI and Next.js WebSockets right now.",
            created_at=now - timedelta(minutes=20),
        )
        msg3 = Message(
            conversation_id=conv_alice_bob.id,
            sender_id=bob.id,
            text="Awesome! Let's test real-time messaging and delivery checkmarks.",
            created_at=now - timedelta(minutes=5),
        )

        db.add_all([msg1, msg2, msg3])
        db.commit()

        # Receipts for Alice & Bob messages
        db.add_all([
            MessageReceipt(message_id=msg1.id, user_id=alice.id, status="read"),
            MessageReceipt(message_id=msg2.id, user_id=bob.id, status="read"),
            MessageReceipt(message_id=msg3.id, user_id=alice.id, status="read"),
        ])
        db.commit()

        # 4. Create 1-on-1 Conversation (Alice & Charlie)
        conv_alice_charlie = Conversation(
            type="direct",
            created_by_id=charlie.id,
            updated_at=now - timedelta(hours=2),
        )
        db.add(conv_alice_charlie)
        db.commit()
        db.refresh(conv_alice_charlie)

        db.add_all([
            ConversationParticipant(conversation_id=conv_alice_charlie.id, user_id=alice.id, role="member"),
            ConversationParticipant(conversation_id=conv_alice_charlie.id, user_id=charlie.id, role="admin"),
        ])
        msg_c1 = Message(
            conversation_id=conv_alice_charlie.id,
            sender_id=charlie.id,
            text="Hey Alice, the Signal dark mode colors look super sleek!",
            created_at=now - timedelta(hours=2),
        )
        db.add(msg_c1)
        db.commit()
        db.add(MessageReceipt(message_id=msg_c1.id, user_id=alice.id, status="delivered"))
        db.commit()

        # 5. Create Group Conversation ("Signal Engineering Team")
        print("Creating group conversation...")
        group_conv = Conversation(
            type="group",
            title="Signal Engineering Team ⚡",
            avatar_url="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150",
            created_by_id=alice.id,
            updated_at=now - timedelta(minutes=1),
        )
        db.add(group_conv)
        db.commit()
        db.refresh(group_conv)

        # Add all 4 users to Group
        db.add_all([
            ConversationParticipant(conversation_id=group_conv.id, user_id=alice.id, role="admin"),
            ConversationParticipant(conversation_id=group_conv.id, user_id=bob.id, role="member"),
            ConversationParticipant(conversation_id=group_conv.id, role="member", user_id=charlie.id),
            ConversationParticipant(conversation_id=group_conv.id, role="member", user_id=diana.id),
        ])

        g_msg1 = Message(
            conversation_id=group_conv.id,
            sender_id=alice.id,
            text="Welcome team to the Signal Project group!",
            created_at=now - timedelta(minutes=10),
        )
        g_msg2 = Message(
            conversation_id=group_conv.id,
            sender_id=diana.id,
            text="Hey everyone! Excited to test group messaging and admin controls.",
            created_at=now - timedelta(minutes=1),
        )
        db.add_all([g_msg1, g_msg2])
        db.commit()

        print("Database seeded successfully with 4 users, contacts, 1-on-1 chats, and group conversation!")
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
