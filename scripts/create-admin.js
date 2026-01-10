/**
 * Utility script to create an admin user
 * Usage: node scripts/create-admin.js "admin@example.com" "Password123" "Admin Name"
 */

const bcrypt = require('bcryptjs')

const email = process.argv[2]
const password = process.argv[3]
const name = process.argv[4]

if (!email || !password || !name) {
  console.error('Usage: node scripts/create-admin.js "email" "password" "name"')
  process.exit(1)
}

bcrypt.hash(password, 10).then((hash) => {
  console.log('\n=== Admin User SQL ===\n')
  console.log(`INSERT INTO admins (email, password_hash, name, role, is_active)`)
  console.log(`VALUES (`)
  console.log(`  '${email.toLowerCase()}',`)
  console.log(`  '${hash}',`)
  console.log(`  '${name}',`)
  console.log(`  'admin',`)
  console.log(`  true`)
  console.log(`);\n`)
  console.log('Copy and run this SQL in your Supabase SQL Editor.\n')
})

