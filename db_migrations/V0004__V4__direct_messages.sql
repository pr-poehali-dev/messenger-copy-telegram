
CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.direct_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    receiver_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    content TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT FALSE,
    disappears_at TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
)
