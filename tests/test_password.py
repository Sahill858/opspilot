from app.auth.password import hash_password, verify_password


def test_password_hashing():
    password = "Sahil@123"

    hashed_password = hash_password(password)

    assert hashed_password != password
    assert verify_password(password, hashed_password)
    assert not verify_password("WrongPassword", hashed_password)