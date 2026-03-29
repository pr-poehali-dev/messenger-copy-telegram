import json
import os
import psycopg2
from datetime import datetime, timedelta

SCHEMA = "t_p1585739_messenger_copy_teleg"
ADMIN_USERNAME = "CoNNectioN"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_from_token(cur, token):
    cur.execute(
        f"SELECT u.id, u.username FROM {SCHEMA}.sessions s JOIN {SCHEMA}.users u ON u.id=s.user_id WHERE s.token=%s AND s.expires_at > NOW()",
        (token,)
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Админ-панель: управление пользователями, группами, каналами (только для CoNNectioN)"""
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
        user_row = get_user_from_token(cur, token)
        if not user_row:
            return {"statusCode": 401, "headers": headers, "body": json.dumps({"error": "Не авторизован"})}

        user_id, username = user_row
        if username != ADMIN_USERNAME:
            return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Нет прав администратора"})}

        # Route by action or path
        if action == "stats" or path.endswith("/stats"):
            route = "stats"
        elif action == "users" or path.endswith("/users"):
            route = "users"
        elif action == "block" or "/block" in path:
            route = "block"
        elif action == "unblock" or "/unblock" in path:
            route = "unblock"
        elif action == "groups" or path.endswith("/groups"):
            route = "groups"
        elif action == "group-messages" or "/group-messages" in path:
            route = "group-messages"
        elif action == "deactivate-group" or "/deactivate-group" in path:
            route = "deactivate-group"
        elif action == "channels" or path.endswith("/channels"):
            route = "channels"
        elif action == "channel-messages" or "/channel-messages" in path:
            route = "channel-messages"
        elif action == "deactivate-channel" or "/deactivate-channel" in path:
            route = "deactivate-channel"
        else:
            route = "stats"

        q = params.get("q", "").strip()
        target_user_id = params.get("user_id")
        group_id = params.get("group_id")
        channel_id = params.get("channel_id")

        if route == "stats":
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.users")
            total_users = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.groups WHERE is_active=TRUE")
            total_groups = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.channels WHERE is_active=TRUE")
            total_channels = cur.fetchone()[0]
            cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.direct_messages")
            total_messages = cur.fetchone()[0]
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "total_users": total_users, "total_groups": total_groups,
                "total_channels": total_channels, "total_messages": total_messages
            })}

        elif route == "users":
            if q:
                cur.execute(f"""
                    SELECT id, username, email, display_name, avatar_url, is_blocked, block_reason, block_until, created_at, password_hash
                    FROM {SCHEMA}.users WHERE username ILIKE %s OR email ILIKE %s ORDER BY created_at DESC
                """, (f"%{q}%", f"%{q}%"))
            else:
                cur.execute(f"""
                    SELECT id, username, email, display_name, avatar_url, is_blocked, block_reason, block_until, created_at, password_hash
                    FROM {SCHEMA}.users ORDER BY created_at DESC
                """)
            rows = cur.fetchall()
            users = []
            for r in rows:
                users.append({
                    "id": r[0], "username": r[1], "email": r[2], "display_name": r[3],
                    "avatar_url": r[4], "is_blocked": r[5], "block_reason": r[6],
                    "block_until": r[7].isoformat() if r[7] else None,
                    "created_at": r[8].isoformat() if r[8] else None,
                    "password_hash": r[9]
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(users)}

        elif route == "block":
            if not target_user_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "user_id required"})}
            reason = body.get("reason", "")
            hours = body.get("hours")
            block_until = None
            if hours:
                block_until = datetime.now() + timedelta(hours=float(hours))
            cur.execute(
                f"UPDATE {SCHEMA}.users SET is_blocked=TRUE, block_reason=%s, block_until=%s WHERE id=%s",
                (reason, block_until, int(target_user_id))
            )
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        elif route == "unblock":
            if not target_user_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "user_id required"})}
            cur.execute(
                f"UPDATE {SCHEMA}.users SET is_blocked=FALSE, block_reason=NULL, block_until=NULL WHERE id=%s",
                (int(target_user_id),)
            )
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        elif route == "groups":
            if q:
                cur.execute(f"""
                    SELECT g.id, g.name, g.description, g.avatar_url, g.created_at, g.is_active,
                        u.username, u.display_name,
                        (SELECT COUNT(*) FROM {SCHEMA}.group_members WHERE group_id=g.id) as members
                    FROM {SCHEMA}.groups g LEFT JOIN {SCHEMA}.users u ON u.id=g.creator_id
                    WHERE g.name ILIKE %s ORDER BY g.created_at DESC
                """, (f"%{q}%",))
            else:
                cur.execute(f"""
                    SELECT g.id, g.name, g.description, g.avatar_url, g.created_at, g.is_active,
                        u.username, u.display_name,
                        (SELECT COUNT(*) FROM {SCHEMA}.group_members WHERE group_id=g.id) as members
                    FROM {SCHEMA}.groups g LEFT JOIN {SCHEMA}.users u ON u.id=g.creator_id
                    ORDER BY g.created_at DESC
                """)
            rows = cur.fetchall()
            groups = []
            for r in rows:
                groups.append({
                    "id": r[0], "name": r[1], "description": r[2], "avatar_url": r[3],
                    "created_at": r[4].isoformat() if r[4] else None, "is_active": r[5],
                    "creator_username": r[6], "creator_name": r[7], "member_count": r[8]
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(groups)}

        elif route == "group-messages":
            if not group_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "group_id required"})}
            cur.execute(f"""
                SELECT gm.id, gm.content, gm.created_at, u.username, u.display_name
                FROM {SCHEMA}.group_messages gm
                JOIN {SCHEMA}.users u ON u.id=gm.sender_id
                WHERE gm.group_id=%s ORDER BY gm.created_at DESC LIMIT 100
            """, (int(group_id),))
            rows = cur.fetchall()
            messages = [{"id": r[0], "content": r[1], "created_at": r[2].isoformat() if r[2] else None, "username": r[3], "display_name": r[4]} for r in rows]
            return {"statusCode": 200, "headers": headers, "body": json.dumps(messages)}

        elif route == "deactivate-group":
            if not group_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "group_id required"})}
            cur.execute(f"UPDATE {SCHEMA}.groups SET is_active=FALSE WHERE id=%s", (int(group_id),))
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        elif route == "channels":
            if q:
                cur.execute(f"""
                    SELECT c.id, c.name, c.description, c.avatar_url, c.created_at, c.is_active,
                        u.username, u.display_name,
                        (SELECT COUNT(*) FROM {SCHEMA}.channel_subscribers WHERE channel_id=c.id) as subs
                    FROM {SCHEMA}.channels c LEFT JOIN {SCHEMA}.users u ON u.id=c.creator_id
                    WHERE c.name ILIKE %s ORDER BY c.created_at DESC
                """, (f"%{q}%",))
            else:
                cur.execute(f"""
                    SELECT c.id, c.name, c.description, c.avatar_url, c.created_at, c.is_active,
                        u.username, u.display_name,
                        (SELECT COUNT(*) FROM {SCHEMA}.channel_subscribers WHERE channel_id=c.id) as subs
                    FROM {SCHEMA}.channels c LEFT JOIN {SCHEMA}.users u ON u.id=c.creator_id
                    ORDER BY c.created_at DESC
                """)
            rows = cur.fetchall()
            channels = []
            for r in rows:
                channels.append({
                    "id": r[0], "name": r[1], "description": r[2], "avatar_url": r[3],
                    "created_at": r[4].isoformat() if r[4] else None, "is_active": r[5],
                    "creator_username": r[6], "creator_name": r[7], "sub_count": r[8]
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(channels)}

        elif route == "channel-messages":
            if not channel_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "channel_id required"})}
            cur.execute(f"""
                SELECT cp.id, cp.content, cp.created_at, u.username, u.display_name
                FROM {SCHEMA}.channel_posts cp
                JOIN {SCHEMA}.users u ON u.id=cp.author_id
                WHERE cp.channel_id=%s ORDER BY cp.created_at DESC LIMIT 100
            """, (int(channel_id),))
            rows = cur.fetchall()
            posts = [{"id": r[0], "content": r[1], "created_at": r[2].isoformat() if r[2] else None, "username": r[3], "display_name": r[4]} for r in rows]
            return {"statusCode": 200, "headers": headers, "body": json.dumps(posts)}

        elif route == "deactivate-channel":
            if not channel_id:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "channel_id required"})}
            cur.execute(f"UPDATE {SCHEMA}.channels SET is_active=FALSE WHERE id=%s", (int(channel_id),))
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Not found"})}

    finally:
        cur.close()
        conn.close()
