
CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.group_message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.group_messages(id),
    user_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    creator_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.channel_subscribers (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.channels(id),
    user_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.channel_posts (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.channels(id),
    author_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.channel_post_reactions (
    id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.channel_posts(id),
    user_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, user_id, emoji)
)
