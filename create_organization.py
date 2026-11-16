from sqlalchemy import select

from app.database.session import SessionLocal
from app.models.organization import Organization

db = SessionLocal()

try:
    organization = db.scalar(
        select(Organization).where(
            Organization.slug == "opspilot-demo"
        )
    )

    if organization:
        print("Organization already exists.")
        print("Organization ID:", organization.id)
    else:
        organization = Organization(
            name="OpsPilot Demo",
            slug="opspilot-demo",
        )

        db.add(organization)
        db.commit()
        db.refresh(organization)

        print("Organization created successfully!")
        print("Organization ID:", organization.id)

except Exception:
    db.rollback()
    raise

finally:
    db.close()
