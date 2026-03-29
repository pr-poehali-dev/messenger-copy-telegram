
CREATE TABLE IF NOT EXISTS t_p1585739_messenger_copy_teleg.sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES t_p1585739_messenger_copy_teleg.users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
)
