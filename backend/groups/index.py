import json
import os
import psycopg2
from datetime import datetime, timedelta

SCHEMA = "t_p1585739_messenger_copy_teleg"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_from_token(cur, token):
    cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def handler(event: dict, context) -> dict:
    """Группы: создание, список, сообщения, участники, реакции"""
    headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
        "Content-Type": "application/json"
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")
    params = event.get("queryStringParameters") or {}
    body = {}
    if event.get("body"):
        body = json.loads(event["body"])

    auth = event.get("headers", {}).get("X-Authorization", "")
    token = auth.replace("Bearer ", "")

    conn = get_conn()
    cur = conn.cursor()

    try:
        user_id = get_user_from_token(cur, token)
        if not user_id:
            return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}

        # GET /groups - список групп пользователя
        if method == "GET" and (path.endswith("/groups") or path == "/"):
            cur.execute(f"""
                SELECT g.id, g.name, g.description, g.avatar_url, g.created_at,
                    u.username as creator, u.display_name as creator_name,
                    (SELECT COUNT(*) FROM {SCHEMA}.group_members WHERE group_id=g.id) as member_count,
                    (SELECT content FROM {SCHEMA}.group_messages WHERE group_id=g.id ORDER BY created_at DESC LIMIT 1) as last_msg,
                    (SELECT created_at FROM {SCHEMA}.group_messages WHERE group_id=g.id ORDER BY created_at DESC LIMIT 1) as last_time,
                    gm.role
                FROM {SCHEMA}.groups g
                JOIN {SCHEMA}.group_members gm ON gm.group_id=g.id AND gm.user_id=%s
                LEFT JOIN {SCHEMA}.users u ON u.id=g.creator_id
                WHERE g.is_active=TRUE
                ORDER BY last_time DESC NULLS LAST
            """, (user_id,))
            rows = cur.fetchall()
            groups = []
            for r in rows:
                groups.append({
                    "id": r[0], "name": r[1], "description": r[2], "avatar_url": r[3],
                    "created_at": r[4].isoformat() if r[4] else None,
                    "creator": r[5], "creator_name": r[6], "member_count": r[7],
                    "last_message": r[8], "last_time": r[9].isoformat() if r[9] else None,
                    "role": r[10]
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(groups)}

        # POST /groups - создать группу
        elif method == "POST" and (path.endswith("/groups") or path == "/"):
            name = body.get("name", "").strip()
            description = body.get("description", "")
            if not name:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Введите название группы"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.groups (name, description, creator_id) VALUES (%s, %s, %s) RETURNING id",
                (name, description, user_id)
            )
            group_id = cur.fetchone()[0]
            cur.execute(f"INSERT INTO {SCHEMA}.group_members (group_id, user_id, role) VALUES (%s, %s, 'admin')", (group_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"id": group_id, "name": name})}

        # GET /groups/{id}/messages
        elif method == "GET" and "/messages" in path:
            parts = path.strip("/").split("/")
            group_id = int(parts[-2]) if parts[-1] == "messages" else int(parts[1])
            offset = int(params.get("offset", 0))
            limit = int(params.get("limit", 50))

            cur.execute(f"SELECT id FROM {SCHEMA}.group_members WHERE group_id=%s AND user_id=%s", (group_id, user_id))
            if not cur.fetchone():
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Нет доступа"})}

            cur.execute(f"""
                SELECT gm.id, gm.sender_id, gm.content, gm.created_at, gm.disappears_at,
                    u.username, u.display_name, u.avatar_url
                FROM {SCHEMA}.group_messages gm
                JOIN {SCHEMA}.users u ON u.id=gm.sender_id
                WHERE gm.group_id=%s
                ORDER BY gm.created_at ASC
                LIMIT %s OFFSET %s
            """, (group_id, limit, offset))
            rows = cur.fetchall()
            messages = []
            for r in rows:
                msg_id = r[0]
                disappears_at = r[4]
                if disappears_at and datetime.now() > disappears_at:
                    continue
                cur.execute(f"SELECT emoji, COUNT(*) FROM {SCHEMA}.group_message_reactions WHERE message_id=%s GROUP BY emoji", (msg_id,))
                reactions = {row[0]: row[1] for row in cur.fetchall()}
                messages.append({
                    "id": msg_id, "sender_id": r[1], "content": r[2],
                    "created_at": r[3].isoformat() if r[3] else None,
                    "disappears_at": disappears_at.isoformat() if disappears_at else None,
                    "username": r[5], "display_name": r[6], "avatar_url": r[7],
                    "reactions": reactions
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(messages)}

        # POST /groups/{id}/messages
        elif method == "POST" and "/messages" in path:
            parts = path.strip("/").split("/")
            group_id = int(parts[-2]) if parts[-1] == "messages" else int(parts[1])
            content = body.get("content", "").strip()
            disappear_hours = body.get("disappear_hours")

            cur.execute(f"SELECT id FROM {SCHEMA}.group_members WHERE group_id=%s AND user_id=%s", (group_id, user_id))
            if not cur.fetchone():
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Нет доступа"})}

            disappears_at = None
            if disappear_hours:
                disappears_at = datetime.now() + timedelta(hours=float(disappear_hours))

            cur.execute(
                f"INSERT INTO {SCHEMA}.group_messages (group_id, sender_id, content, disappears_at) VALUES (%s, %s, %s, %s) RETURNING id, created_at",
                (group_id, user_id, content, disappears_at)
            )
            msg_id, created_at = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "id": msg_id, "sender_id": user_id, "content": content,
                "created_at": created_at.isoformat()
            })}

        # POST /groups/{id}/join
        elif method == "POST" and "/join" in path:
            parts = path.strip("/").split("/")
            group_id = int(parts[-2])
            cur.execute(
                f"INSERT INTO {SCHEMA}.group_members (group_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (group_id, user_id)
            )
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        # POST /groups/{id}/reactions
        elif method == "POST" and "/reactions" in path:
            parts = path.strip("/").split("/")
            group_id = int(parts[-2])
            message_id = body.get("message_id")
            emoji = body.get("emoji")
            cur.execute(
                f"INSERT INTO {SCHEMA}.group_message_reactions (message_id, user_id, emoji) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (message_id, user_id, emoji)
            )
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Not found"})}

    finally:
        cur.close()
        conn.close()
