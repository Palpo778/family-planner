const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || 
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Для облака (Supabase) отключаем строгую проверку SSL-сертификата
const sslConfig = process.env.DATABASE_URL 
    ? { rejectUnauthorized: false } 
    : false;

const pool = new Pool({
    connectionString,
    ssl: sslConfig,
});

module.exports = { query: (text, params) => pool.query(text, params) };
