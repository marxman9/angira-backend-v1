"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDatabase = void 0;
const database_1 = require("./database");
const createTables = async () => {
    try {
        await (0, database_1.query)(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, database_1.query)(`
      CREATE TABLE IF NOT EXISTS chat_threads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, database_1.query)(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        thread_id INTEGER REFERENCES chat_threads(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_user BOOLEAN NOT NULL,
        file_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, database_1.query)(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mimetype VARCHAR(255) NOT NULL,
        size INTEGER NOT NULL,
        path VARCHAR(500) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await (0, database_1.query)(`
      ALTER TABLE messages 
      ADD CONSTRAINT fk_messages_file_id 
      FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL
    `);
        await (0, database_1.query)(`CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id)`);
        await (0, database_1.query)(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`);
        await (0, database_1.query)(`CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id ON chat_threads(user_id)`);
        await (0, database_1.query)(`CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id)`);
        console.log('✅ Database tables created successfully');
    }
    catch (error) {
        console.error('❌ Error creating database tables:', error);
        throw error;
    }
};
const setupDatabase = async () => {
    await createTables();
};
exports.setupDatabase = setupDatabase;
if (require.main === module) {
    (0, exports.setupDatabase)()
        .then(() => {
        console.log('✅ Database setup completed');
        process.exit(0);
    })
        .catch((error) => {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    });
}
