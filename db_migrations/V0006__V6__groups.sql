
CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    creator_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.group_members (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.groups(id),
    user_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    role VARCHAR(20) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.group_messages (
    id SERIAL PRIMARY KEY,
    group_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.groups(id),
    sender_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    content TEXT NOT NULL,
    disappears_at TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
)
