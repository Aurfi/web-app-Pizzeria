import bcrypt from 'bcrypt';
import pkg from 'pg';
const { Pool } = pkg;

async function createAdmin() {
  const pool = new Pool({
    user: 'postgres',
    password: 'postgres', 
    host: 'localhost',
    port: 5432,
    database: 'foodflow'
  });

  try {
    const hash = await bcrypt.hash('admin123', 12);
    console.log('Generated hash:', hash);

    const result = await pool.query(`
      UPDATE users 
      SET password_hash = $1, role = 'owner'
      WHERE email = 'admin@mariospizzeria.com'
    `, [hash]);

    console.log('Updated rows:', result.rowCount);

    // Verify the hash was stored correctly
    const verify = await pool.query('SELECT email, password_hash FROM users WHERE email = $1', ['admin@mariospizzeria.com']);
    console.log('Stored hash:', verify.rows[0]?.password_hash);

    // Test the comparison
    const isValid = await bcrypt.compare('admin123', verify.rows[0]?.password_hash);
    console.log('Hash comparison valid:', isValid);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

createAdmin();