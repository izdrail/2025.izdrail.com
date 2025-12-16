DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS messages;

CREATE TABLE conversations (
                               id TEXT PRIMARY KEY,
                               title TEXT NOT NULL,
                               preview TEXT,
                               timestamp TEXT
);

CREATE TABLE messages (
                          id TEXT PRIMARY KEY,
                          conversation_id TEXT NOT NULL,
                          role TEXT NOT NULL,
                          name TEXT,
                          avatarFallback TEXT,
                          content TEXT NOT NULL,
                          markdown INTEGER DEFAULT 0,
                          attachments TEXT,
                          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                          FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
