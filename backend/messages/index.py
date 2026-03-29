import json
import os
import psycopg2
from datetime import datetime, timedelta

SCHEMA = "t_p1585739_messenger_copy_teleg"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_from_token(cur, token):
    cur.execute(
        f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s AND expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    return row[0] if row else None

def handler(event: dict, context) -> dict:
    """Личные сообщения: отправка, получение, реакции, исчезающие сообщения"""
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

    token = event.get("headers", {}).get("X-Auth-Token", "")

    conn = get_conn()
    cur = conn.cursor()

    try:
        user_id = get_user_from_token(cur, token)
        if not user_id:
            return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}

        # GET /chats - список диалогов
        if method == "GET" and (path.endswith("/chats") or action == "chats"):
            cur.execute(f"""
                SELECT DISTINCT ON (partner_id) partner_id, u.username, u.display_name, u.avatar_url, u.is_online,
                    dm.content, dm.created_at, dm.sender_id,
                    (SELECT COUNT(*) FROM {SCHEMA}.direct_messages WHERE receiver_id=%s AND sender_id=partner_id AND is_read=FALSE) as unread
                FROM (
                    SELECT CASE WHEN sender_id=%s THEN receiver_id ELSE sender_id END as partner_id,
                        id, content, created_at, sender_id
                    FROM {SCHEMA}.direct_messages
                    WHERE (sender_id=%s OR receiver_id=%s) AND is_read IS NOT NULL
                    ORDER BY created_at DESC
                ) dm
                JOIN {SCHEMA}.users u ON u.id = dm.partner_id
                ORDER BY partner_id, dm.created_at DESC
            """, (user_id, user_id, user_id, user_id))
            rows = cur.fetchall()
            chats = []
            for r in rows:
                chats.append({
                    "partner_id": r[0], "username": r[1], "display_name": r[2],
                    "avatar_url": r[3], "is_online": r[4],
                    "last_message": r[5], "last_time": r[6].isoformat() if r[6] else None,
                    "last_sender_id": r[7], "unread": r[8]
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(chats)}

        # GET /messages?with=user_id
        elif method == "GET" and (path.endswith("/messages") or action == "messages"):
            with_user = int(params.get("with", 0))
            offset = int(params.get("offset", 0))
            limit = int(params.get("limit", 50))

            cur.execute(f"""
                SELECT dm.id, dm.sender_id, dm.receiver_id, dm.content, dm.created_at,
                    dm.disappears_at, dm.is_read,
                    u.username, u.display_name, u.avatar_url
                FROM {SCHEMA}.direct_messages dm
                JOIN {SCHEMA}.users u ON u.id = dm.sender_id
                WHERE ((dm.sender_id=%s AND dm.receiver_id=%s) OR (dm.sender_id=%s AND dm.receiver_id=%s))
                ORDER BY dm.created_at ASC
                LIMIT %s OFFSET %s
            """, (user_id, with_user, with_user, user_id, limit, offset))
            rows = cur.fetchall()

            # Mark as read
            cur.execute(f"UPDATE {SCHEMA}.direct_messages SET is_read=TRUE WHERE receiver_id=%s AND sender_id=%s AND is_read=FALSE", (user_id, with_user))
            conn.commit()

            messages = []
            for r in rows:
                msg_id = r[0]
                disappears_at = r[5]
                if disappears_at and datetime.now() > disappears_at:
                    continue
                cur.execute(f"SELECT emoji, COUNT(*) FROM {SCHEMA}.message_reactions WHERE message_id=%s GROUP BY emoji", (msg_id,))
                reactions = {row[0]: row[1] for row in cur.fetchall()}
                messages.append({
                    "id": msg_id, "sender_id": r[1], "receiver_id": r[2],
                    "content": r[3], "created_at": r[4].isoformat() if r[4] else None,
                    "disappears_at": disappears_at.isoformat() if disappears_at else None,
                    "is_read": r[6], "username": r[7], "display_name": r[8], "avatar_url": r[9],
                    "reactions": reactions
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(messages)}

        # POST /messages
        elif method == "POST" and (path.endswith("/messages") or action == "send"):
            receiver_id = body.get("receiver_id")
            content = body.get("content", "").strip()
            disappear_hours = body.get("disappear_hours")

            if not receiver_id or not content:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Укажите получателя и текст"})}

            disappears_at = None
            if disappear_hours:
                disappears_at = datetime.now() + timedelta(hours=float(disappear_hours))

            cur.execute(
                f"INSERT INTO {SCHEMA}.direct_messages (sender_id, receiver_id, content, disappears_at) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
                (user_id, receiver_id, content, disappears_at)
            )
            msg_id, created_at = cur.fetchone()
            conn.commit()

            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "id": msg_id, "sender_id": user_id, "receiver_id": receiver_id,
                "content": content, "created_at": created_at.isoformat(),
                "disappears_at": disappears_at.isoformat() if disappears_at else None
            })}

        # POST /reactions
        elif method == "POST" and (path.endswith("/reactions") or action == "react"):
            message_id = body.get("message_id")
            emoji = body.get("emoji")
            if not message_id or not emoji:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Нет данных"})}
            cur.execute(
                f"SELECT id FROM {SCHEMA}.message_reactions WHERE message_id=%s AND user_id=%s AND emoji=%s",
                (message_id, user_id, emoji)
            )
            if cur.fetchone():
                cur.execute(f"UPDATE {SCHEMA}.message_reactions SET created_at=NOW() WHERE message_id=%s AND user_id=%s AND emoji=%s", (message_id, user_id, emoji))
            else:
                cur.execute(f"INSERT INTO {SCHEMA}.message_reactions (message_id, user_id, emoji) VALUES (%s, %s, %s)", (message_id, user_id, emoji))
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        # GET /users/search?q=
        elif method == "GET" and (path.endswith("/users/search") or action == "search"):
            q = params.get("q", "").strip()
            if not q:
                return {"statusCode": 200, "headers": headers, "body": json.dumps([])}
            cur.execute(
                f"SELECT id, username, display_name, avatar_url, is_online FROM {SCHEMA}.users WHERE (username ILIKE %s OR display_name ILIKE %s) AND id != %s LIMIT 20",
                (f"%{q}%", f"%{q}%", user_id)
            )
            rows = cur.fetchall()
            users = [{"id": r[0], "username": r[1], "display_name": r[2], "avatar_url": r[3], "is_online": r[4]} for r in rows]
            return {"statusCode": 200, "headers": headers, "body": json.dumps(users)}

        return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Not found"})}

    finally:
        cur.close()
        conn.close()