import json
import hashlib
import secrets
import os
import psycopg2
from datetime import datetime, timedelta

SCHEMA = "t_p1585739_messenger_copy_teleg"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    """Аутентификация: регистрация, вход, выход, проверка сессии"""
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token, X-Authorization",
        "Content-Type": "application/json"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    params = event.get("queryStringParameters") or {}
    action = params.get("action", "")
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    # Support both path-based and action-based routing
    if path.endswith("/register") or action == "register":
        route = "register"
    elif path.endswith("/login") or action == "login":
        route = "login"
    elif path.endswith("/logout") or action == "logout":
        route = "logout"
    elif path.endswith("/me") or action == "me":
        route = "me"
    elif path.endswith("/profile") or action == "profile":
        route = "profile"
    else:
        route = action or "me"

    token = event.get("headers", {}).get("X-Auth-Token", "")

    conn = get_conn()
    cur = conn.cursor()

    try:
        if route == "register":
            username = body.get("username", "").strip()
            email = body.get("email", "").strip()
            password = body.get("password", "")
            display_name = body.get("display_name", username)

            if not username or not email or not password:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Заполните все поля"})}

            cur.execute(f"SELECT id FROM {SCHEMA}.users WHERE username=%s OR email=%s", (username, email))
            if cur.fetchone():
                return {"statusCode": 409, "headers": headers, "body": json.dumps({"error": "Пользователь уже существует"})}

            pw_hash = hash_password(password)
            cur.execute(
                f"INSERT INTO {SCHEMA}.users (username, email, password_hash, display_name) VALUES (%s, %s, %s, %s) RETURNING id",
                (username, email, pw_hash, display_name)
            )
            user_id = cur.fetchone()[0]
            new_token = secrets.token_hex(32)
            expires_at = datetime.now() + timedelta(days=30)
            cur.execute(
                f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user_id, new_token, expires_at)
            )
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "token": new_token,
                "user": {"id": user_id, "username": username, "email": email, "display_name": display_name}
            })}

        elif route == "login":
            login = body.get("login", "").strip()
            password = body.get("password", "")
            pw_hash = hash_password(password)
            cur.execute(
                f"SELECT id, username, email, display_name, avatar_url, bio, is_blocked, block_reason, block_until FROM {SCHEMA}.users WHERE (username=%s OR email=%s) AND password_hash=%s",
                (login, login, pw_hash)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Неверный логин или пароль"})}

            user_id, username, email, display_name, avatar_url, bio, is_blocked, block_reason, block_until = row
            if is_blocked:
                if block_until and datetime.now() < block_until:
                    return {"statusCode": 403, "headers": headers, "body": json.dumps({
                        "error": f"Аккаунт заблокирован. Причина: {block_reason}. До: {block_until.isoformat()}"
                    })}
                elif not block_until:
                    return {"statusCode": 403, "headers": headers, "body": json.dumps({
                        "error": f"Аккаунт заблокирован. Причина: {block_reason}"
                    })}

            new_token = secrets.token_hex(32)
            expires_at = datetime.now() + timedelta(days=30)
            cur.execute(
                f"INSERT INTO {SCHEMA}.sessions (user_id, token, expires_at) VALUES (%s, %s, %s)",
                (user_id, new_token, expires_at)
            )
            cur.execute(f"UPDATE {SCHEMA}.users SET is_online=TRUE, last_seen=NOW() WHERE id=%s", (user_id,))
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "token": new_token,
                "user": {"id": user_id, "username": username, "email": email, "display_name": display_name, "avatar_url": avatar_url, "bio": bio}
            })}

        elif route == "logout":
            if token:
                cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s", (token,))
                row = cur.fetchone()
                if row:
                    cur.execute(f"UPDATE {SCHEMA}.users SET is_online=FALSE, last_seen=NOW() WHERE id=%s", (row[0],))
                cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at=NOW() WHERE token=%s", (token,))
                conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        elif route == "me":
            cur.execute(
                f"SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.bio, u.created_at FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id WHERE s.token=%s AND s.expires_at > NOW()",
                (token,)
            )
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}
            uid, username, email, display_name, avatar_url, bio, created_at = row
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "id": uid, "username": username, "email": email,
                "display_name": display_name, "avatar_url": avatar_url, "bio": bio,
                "created_at": created_at.isoformat() if created_at else None
            })}

        elif route == "profile":
            cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s AND expires_at > NOW()", (token,))
            row = cur.fetchone()
            if not row:
                return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}
            user_id = row[0]
            display_name = body.get("display_name")
            bio = body.get("bio")
            avatar_url = body.get("avatar_url")
            if display_name is not None:
                cur.execute(f"UPDATE {SCHEMA}.users SET display_name=%s WHERE id=%s", (display_name, user_id))
            if bio is not None:
                cur.execute(f"UPDATE {SCHEMA}.users SET bio=%s WHERE id=%s", (bio, user_id))
            if avatar_url is not None:
                cur.execute(f"UPDATE {SCHEMA}.users SET avatar_url=%s WHERE id=%s", (avatar_url, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}

    finally:
        cur.close()
        conn.close()
