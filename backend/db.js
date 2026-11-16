const { Pool } = require('pg');
require('dotenv').config();

const isProduction = !!process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
        `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    // На Render принудительно разрешаем самоподписанные сертификаты Supabase
    ssl: isProduction ? { rejectUnauthorized: false } : false,
});

module.exports = { query: (text, params) => pool.query(text, params) };
