const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'civicpulse',
  user: 'postgres',
  password: 'postgres',
});

async function seed() {
  try {
    // Insert admin user
    const adminResult = await pool.query(`
      INSERT INTO users (full_name, email, phone, password_hash, role_id)
      SELECT 'Admin Demo', 'admin@example.com', '9000000099', 'dev-placeholder-hash', id 
      FROM roles WHERE name = 'municipal_admin'
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('Admin user:', adminResult.rowCount, 'row(s) inserted');

    // Verify all demo users exist
    const users = await pool.query(
      "SELECT email, r.name as role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email LIKE '%@example.com' ORDER BY u.email"
    );
    console.log('\nDemo users in database:');
    users.rows.forEach(u => console.log(' -', u.email, ':', u.role));

    await pool.end();
    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

seed();
