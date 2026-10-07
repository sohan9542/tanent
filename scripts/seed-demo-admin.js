/**
 * Seed the portfolio demo platform admin in Supabase.
 * Usage: node scripts/seed-demo-admin.js
 * Requires .env.local with Supabase URL + service role key.
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const EMAIL = 'demo@tanent.app'
const PASSWORD = 'Demo123!'
const NAME = 'Demo Admin'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error(`Create user manually: ${EMAIL} / ${PASSWORD} (platform_admin)`)
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  let user = list?.users?.find((u) => u.email?.toLowerCase() === EMAIL)

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
    user = data.user
    console.log('Created auth user', user.id)
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, {
      password: PASSWORD,
      email_confirm: true,
    })
    if (error) throw error
    console.log('Updated auth user password', user.id)
  }

  const { data: existing } = await admin
    .from('platform_users')
    .select('*')
    .eq('email', EMAIL)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('platform_users')
      .update({
        auth_user_id: user.id,
        name: NAME,
        role: 'platform_admin',
        is_active: true,
      })
      .eq('id', existing.id)
    if (error) throw error
    console.log('Updated platform_users row')
  } else {
    const { error } = await admin.from('platform_users').insert({
      auth_user_id: user.id,
      email: EMAIL,
      name: NAME,
      role: 'platform_admin',
      is_active: true,
    })
    if (error) throw error
    console.log('Inserted platform_users row')
  }

  console.log(`Demo admin ready: ${EMAIL} / ${PASSWORD}`)
  console.log('Login at /platform/login')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
