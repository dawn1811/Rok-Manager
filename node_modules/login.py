import json
import bcrypt
import firebase_admin
from firebase_admin import auth, firestore
from firebase_functions import https_fn


@https_fn.on_request()
def login(request: https_fn.Request) -> https_fn.Response:
    """POST /login

    Body JSON: { "governorId": "string", "password": "string" }

    Looks up the user document in `players_auth/{governorId}` which should contain
    a `password_hash` (bcrypt hash). If valid, issues a Firebase Custom Token with
    the governorId as uid and returns it as JSON: { "token": "..." }.
    """
    try:
        if request.method != 'POST':
            return https_fn.Response('Method Not Allowed', status=405)

        data = request.json
        if not data:
            return https_fn.Response('Bad Request: expected JSON body', status=400)

        governor_id = data.get('governorId')
        password = data.get('password')
        if not governor_id or not password:
            return https_fn.Response('Missing governorId or password', status=400)

        # Firestore lookup
        db = firestore.client()
        doc_ref = db.collection('players_auth').document(governor_id)
        doc = doc_ref.get()
        if not doc.exists:
            return https_fn.Response('Invalid credentials', status=401)

        doc_data = doc.to_dict() or {}
        pw_hash = doc_data.get('password_hash')
        if not pw_hash:
            return https_fn.Response('Invalid credentials', status=401)

        # bcrypt expects bytes
        if isinstance(pw_hash, str):
            pw_hash_b = pw_hash.encode('utf-8')
        else:
            pw_hash_b = pw_hash

        if not bcrypt.checkpw(password.encode('utf-8'), pw_hash_b):
            return https_fn.Response('Invalid credentials', status=401)

        # Determine internal uid mapping (prefer stored uid to avoid predictable UIDs)
        uid = doc_data.get('uid')
        if not uid:
            import uuid
            uid = str(uuid.uuid4())
            # store the mapping back to Firestore so future logins reuse the same uid
            try:
                doc_ref.set({'uid': uid}, merge=True)
            except Exception:
                pass

        # Create custom token using internal uid
        token = auth.create_custom_token(uid)
        # token is bytes; decode for JSON
        if isinstance(token, bytes):
            token = token.decode('utf-8')

        return https_fn.Response(json.dumps({'token': token}), status=200, headers={'Content-Type': 'application/json'})

    except Exception as e:
        # Avoid leaking sensitive info
        return https_fn.Response(f'Internal server error: {e}', status=500)


@https_fn.on_request()
def request_password_reset(request: https_fn.Request) -> https_fn.Response:
    """POST /request_password_reset
    Body: { "governorId": "..." }
    Creates a short-lived reset token in Firestore which an admin or email delivery
    system can send to the user. This implementation just returns the token for
    demo/dev use — in production you should email it or integrate with SMS.
    """
    try:
        if request.method != 'POST':
            return https_fn.Response('Method Not Allowed', status=405)
        data = request.json
        if not data or 'governorId' not in data:
            return https_fn.Response('Bad Request', status=400)
        governor_id = data['governorId']

        db = firestore.client()
        doc_ref = db.collection('players_auth').document(governor_id)
        doc = doc_ref.get()
        if not doc.exists:
            return https_fn.Response('If the account exists, a reset token has been created.', status=200)

        import secrets, time
        token = secrets.token_urlsafe(32)
        expires = int(time.time()) + 3600  # 1 hour
        db.collection('password_resets').document(token).set({
            'governorId': governor_id,
            'expires': expires,
        })

        # In production: send token via email to user. Here we return token for demo.
        return https_fn.Response(json.dumps({'resetToken': token}), status=200, headers={'Content-Type': 'application/json'})
    except Exception as e:
        return https_fn.Response('Internal server error', status=500)


@https_fn.on_request()
def reset_password(request: https_fn.Request) -> https_fn.Response:
    """POST /reset_password
    Body: { "resetToken": "...", "newPassword": "..." }
    Validates token and sets new bcrypt hashed password for the governor.
    """
    try:
        if request.method != 'POST':
            return https_fn.Response('Method Not Allowed', status=405)
        data = request.json
        if not data or 'resetToken' not in data or 'newPassword' not in data:
            return https_fn.Response('Bad Request', status=400)
        token = data['resetToken']
        new_password = data['newPassword']

        db = firestore.client()
        token_doc = db.collection('password_resets').document(token).get()
        if not token_doc.exists:
            return https_fn.Response('Invalid or expired token', status=400)
        token_data = token_doc.to_dict() or {}
        import time
        if token_data.get('expires', 0) < int(time.time()):
            return https_fn.Response('Invalid or expired token', status=400)

        governor_id = token_data.get('governorId')
        if not governor_id:
            return https_fn.Response('Invalid token', status=400)

        pw_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        db.collection('players_auth').document(governor_id).set({'password_hash': pw_hash.decode('utf-8')}, merge=True)
        # Delete the token once used
        db.collection('password_resets').document(token).delete()
        return https_fn.Response('Password reset', status=200)
    except Exception as e:
        return https_fn.Response('Internal server error', status=500)
