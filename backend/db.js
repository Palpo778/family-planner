const { Pool } = require('pg');
const { parse } = require('pg-connection-string');
require('dotenv').config();

// Парсим строку подключения, чтобы контролировать параметры
const config = process.env.DATABASE_URL 
    ? parse(process.env.DATABASE_URL) 
    : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      };

const pool = new Pool({
    ...config,
    // Для Supabase в облаке обязательно отключаем строгую проверку SSL
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

module.exports = { query: (text, params) => pool.query(text, params) };
