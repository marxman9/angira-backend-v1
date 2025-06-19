"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.connectDB = exports.pool = void 0;
const pg_1 = require("pg");
const environment_1 = require("./environment");
const poolConfig = {
    host: environment_1.config.database.host,
    port: environment_1.config.database.port,
    database: environment_1.config.database.name,
    user: environment_1.config.database.user,
    password: environment_1.config.database.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};
exports.pool = new pg_1.Pool(poolConfig);
const connectDB = async () => {
    try {
        const client = await exports.pool.connect();
        console.log('✅ PostgreSQL connected successfully');
        client.release();
    }
    catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
const query = (text, params) => {
    return exports.pool.query(text, params);
};
exports.query = query;
