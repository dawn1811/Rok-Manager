"""Admin helper script (not an HTTP function): create a players_auth document with bcrypt hash.

Usage (run with the functions venv python):
  python create_user.py <governorId> <password>

This script writes to Firestore directly using Application Default Credentials or
the service account available in the environment.
"""
import sys
import json
import bcrypt
import uuid
import firebase_admin
from firebase_admin import credentials, firestore


def main():
    if len(sys.argv) < 3:
        print("Usage: python create_user.py <governorId> <password>")
        sys.exit(2)
    governor_id = sys.argv[1]
    password = sys.argv[2]

    # Initialize Admin SDK if needed
    if not firebase_admin._apps:
        firebase_admin.initialize_app()

    db = firestore.client()

    pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    uid = str(uuid.uuid4())

    doc_ref = db.collection('players_auth').document(governor_id)
    doc_ref.set({
        'password_hash': pw_hash.decode('utf-8'),
        'uid': uid,
    }, merge=True)

    print(f"Created user {governor_id} with uid {uid}")


if __name__ == '__main__':
    main()
