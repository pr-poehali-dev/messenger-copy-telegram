import json
import os
import psycopg2

SCHEMA = "t_p1585739_messenger_copy_teleg"

def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def get_user_from_token(cur, token):
    cur.execute(f"SELECT user_id FROM {SCHEMA}.sessions WHERE token=%s AND expires_at > NOW()", (token,))
    row = cur.fetchone()
    return row[0] if row else None

def handler(event: dict, context) -> dict:
    """Каналы: создание, список, посты, реакции, подписка"""
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

        # GET /channels
        if method == "GET" and (path.endswith("/channels") or path == "/"):
            cur.execute(f"""
                SELECT c.id, c.name, c.description, c.avatar_url, c.created_at,
                    u.username as creator, u.display_name as creator_name,
                    (SELECT COUNT(*) FROM {SCHEMA}.channel_subscribers WHERE channel_id=c.id) as sub_count,
                    (SELECT content FROM {SCHEMA}.channel_posts WHERE channel_id=c.id AND is_active=TRUE ORDER BY created_at DESC LIMIT 1) as last_post,
                    (SELECT created_at FROM {SCHEMA}.channel_posts WHERE channel_id=c.id AND is_active=TRUE ORDER BY created_at DESC LIMIT 1) as last_time,
                    EXISTS(SELECT 1 FROM {SCHEMA}.channel_subscribers WHERE channel_id=c.id AND user_id=%s) as is_subscribed
                FROM {SCHEMA}.channels c
                LEFT JOIN {SCHEMA}.users u ON u.id=c.creator_id
                WHERE c.is_active=TRUE
                ORDER BY sub_count DESC
            """, (user_id,))
            rows = cur.fetchall()
            channels = []
            for r in rows:
                channels.append({
                    "id": r[0], "name": r[1], "description": r[2], "avatar_url": r[3],
                    "created_at": r[4].isoformat() if r[4] else None,
                    "creator": r[5], "creator_name": r[6], "sub_count": r[7],
                    "last_post": r[8], "last_time": r[9].isoformat() if r[9] else None,
                    "is_subscribed": r[10]
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(channels)}

        # POST /channels
        elif method == "POST" and (path.endswith("/channels") or path == "/"):
            name = body.get("name", "").strip()
            description = body.get("description", "")
            if not name:
                return {"statusCode": 400, "headers": headers, "body": json.dumps({"error": "Введите название канала"})}
            cur.execute(
                f"INSERT INTO {SCHEMA}.channels (name, description, creator_id) VALUES (%s, %s, %s) RETURNING id",
                (name, description, user_id)
            )
            channel_id = cur.fetchone()[0]
            cur.execute(f"INSERT INTO {SCHEMA}.channel_subscribers (channel_id, user_id) VALUES (%s, %s)", (channel_id, user_id))
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"id": channel_id, "name": name})}

        # GET /channels/{id}/posts
        elif method == "GET" and "/posts" in path:
            parts = path.strip("/").split("/")
            channel_id = int(parts[-2]) if parts[-1] == "posts" else int(parts[1])
            offset = int(params.get("offset", 0))
            limit = int(params.get("limit", 50))

            cur.execute(f"""
                SELECT cp.id, cp.author_id, cp.content, cp.created_at,
                    u.username, u.display_name, u.avatar_url
                FROM {SCHEMA}.channel_posts cp
                JOIN {SCHEMA}.users u ON u.id=cp.author_id
                WHERE cp.channel_id=%s AND cp.is_active=TRUE
                ORDER BY cp.created_at ASC
                LIMIT %s OFFSET %s
            """, (channel_id, limit, offset))
            rows = cur.fetchall()
            posts = []
            for r in rows:
                post_id = r[0]
                cur.execute(f"SELECT emoji, COUNT(*) FROM {SCHEMA}.channel_post_reactions WHERE post_id=%s GROUP BY emoji", (post_id,))
                reactions = {row[0]: row[1] for row in cur.fetchall()}
                posts.append({
                    "id": post_id, "author_id": r[1], "content": r[2],
                    "created_at": r[3].isoformat() if r[3] else None,
                    "username": r[4], "display_name": r[5], "avatar_url": r[6],
                    "reactions": reactions
                })
            return {"statusCode": 200, "headers": headers, "body": json.dumps(posts)}

        # POST /channels/{id}/posts
        elif method == "POST" and "/posts" in path:
            parts = path.strip("/").split("/")
            channel_id = int(parts[-2]) if parts[-1] == "posts" else int(parts[1])
            content = body.get("content", "").strip()

            cur.execute(f"SELECT id FROM {SCHEMA}.channels WHERE id=%s AND creator_id=%s", (channel_id, user_id))
            if not cur.fetchone():
                return {"statusCode": 403, "headers": headers, "body": json.dumps({"error": "Только создатель может публиковать"})}

            cur.execute(
                f"INSERT INTO {SCHEMA}.channel_posts (channel_id, author_id, content) VALUES (%s, %s, %s) RETURNING id, created_at",
                (channel_id, user_id, content)
            )
            post_id, created_at = cur.fetchone()
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({
                "id": post_id, "content": content, "created_at": created_at.isoformat()
            })}

        # POST /channels/{id}/subscribe
        elif method == "POST" and "/subscribe" in path:
            parts = path.strip("/").split("/")
            channel_id = int(parts[-2])
            cur.execute(
                f"INSERT INTO {SCHEMA}.channel_subscribers (channel_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (channel_id, user_id)
            )
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        # POST /channels/{id}/reactions
        elif method == "POST" and "/reactions" in path:
            parts = path.strip("/").split("/")
            post_id = body.get("post_id")
            emoji = body.get("emoji")
            cur.execute(
                f"INSERT INTO {SCHEMA}.channel_post_reactions (post_id, user_id, emoji) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                (post_id, user_id, emoji)
            )
            conn.commit()
            return {"statusCode": 200, "headers": headers, "body": json.dumps({"ok": True})}

        return {"statusCode": 404, "headers": headers, "body": json.dumps({"error": "Not found"})}

    finally:
        cur.close()
        conn.close()
