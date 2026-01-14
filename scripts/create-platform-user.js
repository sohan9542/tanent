/**
 * Script to create platform admin or platform staff user
 * 
 * Usage:
 *   node scripts/create-platform-user.js <email> <name> <role>
 * 
 * Examples:
 *   node scripts/create-platform-user.js admin@example.com "Admin Name" platform_admin
 *   node scripts/create-platform-user.js staff@example.com "Staff Name" platform_staff
 */

const { createClient } = require('@supabase/supabase-js')
const readline = require('readline')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('Error: Missing Supabase environment variables')
  console.error('Make sure .env.local has:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create admin client for creating users
const supabaseAdminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create admin client for database operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Get command line arguments
const args = process.argv.slice(2)

if (args.length < 3) {
  console.log('Usage: node scripts/create-platform-user.js <email> <name> <role>')
  console.log('Roles: platform_admin or platform_staff')
  console.log('')
  console.log('Example:')
  console.log('  node scripts/create-platform-user.js admin@example.com "Admin Name" platform_admin')
  process.exit(1)
}

const [email, name, role] = args

if (!['platform_admin', 'platform_staff'].includes(role)) {
  console.error('Error: Role must be either "platform_admin" or "platform_staff"')
  process.exit(1)
}

// Create readline interface for password input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function createPlatformUser() {
  try {
    // Prompt for password
    const password = await new Promise((resolve) => {
      rl.question('Enter password for the user: ', (answer) => {
        resolve(answer)
      })
    })

    if (!password || password.length < 6) {
      console.error('Error: Password must be at least 6 characters')
      rl.close()
      process.exit(1)
    }

    console.log('\nCreating user in Supabase Auth...')

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdminClient.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true // Auto-confirm email
    })

    if (authError) {
      console.error('Error creating user in Supabase Auth:', authError.message)
      rl.close()
      process.exit(1)
    }

    console.log('✓ User created in Supabase Auth')
    console.log('  Auth User ID:', authData.user.id)

    // Step 2: Create platform_users record
    console.log('\nCreating platform_users record...')

    const { data: platformUser, error: platformError } = await supabaseAdmin
      .from('platform_users')
      .insert({
        auth_user_id: authData.user.id,
        email: email.trim(),
        name: name.trim(),
        role: role,
        is_active: true
      })
      .select()
      .single()

    if (platformError) {
      console.error('Error creating platform_users record:', platformError.message)
      
      // Try to clean up auth user if platform_users creation failed
      console.log('\nCleaning up auth user...')
      await supabaseAdminClient.auth.admin.deleteUser(authData.user.id)
      
      rl.close()
      process.exit(1)
    }

    console.log('✓ Platform user created successfully!')
    console.log('\nUser Details:')
    console.log('  ID:', platformUser.id)
    console.log('  Email:', platformUser.email)
    console.log('  Name:', platformUser.name)
    console.log('  Role:', platformUser.role)
    console.log('\nUser can now login at: /platform/login')

    rl.close()
  } catch (error) {
    console.error('Unexpected error:', error)
    rl.close()
    process.exit(1)
  }
}

createPlatformUser()
