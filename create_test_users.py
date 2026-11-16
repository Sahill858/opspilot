from sqlalchemy import select
from app.database.session import SessionLocal
from app.models.user import User
from app.auth.password import hash_password
from app.models.organization import Organization

ORGANIZATION_ID = 1

TEST_USERS = [
    {
        "full_name": "Test Manager",
        "email": "manager.test@opspilot.com",
        "password": "Manager@Test123",
        "role": "manager",
    },
    {
        "full_name": "Test Admin",
        "email": "admin.test@opspilot.com",
        "password": "Admin@Test123",
        "role": "admin",
    },
]

db = SessionLocal()

try:
    for user_data in TEST_USERS:
        existing_user = db.scalar(
            select(User).where(
                User.email == user_data["email"]
            )
        )

        if existing_user:
            print(
                f"Already exists: {user_data['email']} "
                f"(role: {existing_user.role})"
            )
            continue

        user = User(
            organization_id=ORGANIZATION_ID,
            full_name=user_data["full_name"],
            email=user_data["email"],
            password_hash=hash_password(user_data["password"]),
            role=user_data["role"],
            is_active=True,
        )

        db.add(user)
        db.commit()

        print(
            f"Created: {user.email} "
            f"(role: {user.role}, id: {user.id})"
        )

except Exception:
    db.rollback()
    raise

finally:
    db.close()