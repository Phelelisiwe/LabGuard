from getpass import getpass

from app.database import SessionLocal
from app.models.admin import SuperAdmin
from app.security import hash_password


def main():
    email = input("Enter Super Admin email: ").strip()
    password = getpass("Enter Super Admin password: ")
    confirm_password = getpass("Confirm Super Admin password: ")

    if password != confirm_password:
        print("Passwords do not match.")
        return

    db = SessionLocal()

    try:
        existing_admin = db.query(SuperAdmin).filter(
            SuperAdmin.email == email
        ).first()

        if existing_admin:
            print("A Super Admin with this email already exists.")
            return

        admin = SuperAdmin(
            email=email,
            password_hash=hash_password(password)
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("Super Admin created successfully.")
        print(f"Email: {admin.email}")

    finally:
        db.close()


if __name__ == "__main__":
    main()