
CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.message_reactions (
    id SERIAL PRIMARY KEY,
    message_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.direct_messages(id),
    user_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
)
