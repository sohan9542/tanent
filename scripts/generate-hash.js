/**
 * Utility script to generate bcrypt hash for last names
 * Usage: node scripts/generate-hash.js "Smith"
 */

const bcrypt = require('bcryptjs')

const lastName = process.argv[2]

if (!lastName) {
  console.error('Usage: node scripts/generate-hash.js "Last Name"')
  process.exit(1)
}

bcrypt.hash(lastName, 10).then((hash) => {
  console.log(`Last Name: ${lastName}`)
  console.log(`Hash: ${hash}`)
  console.log('\nUse this hash in your SQL INSERT statement for the last_name_hash column.')
})


