import mysql from 'mysql2/promise';

(async () => {
  try {
    const pool = await mysql.createPool({
      host: '127.0.0.1',
      user: 'root',
      password: '132007',
      database: 'simply_safe',
    });
    const [rows] = await pool.query('SELECT 1 AS ok');
    console.log('db connected', rows);
    await pool.end();
  } catch (err) {
    console.error('connection error', err.message);
  }
})();
