
CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.contacts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    contact_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, contact_id)
)
