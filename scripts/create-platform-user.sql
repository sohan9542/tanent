-- SQL Script to Create Platform Admin/Staff User
-- 
-- STEP 1: Create user in Supabase Auth (via Dashboard or API)
-- Go to Supabase Dashboard → Authentication → Users → Add User
-- Copy the User ID (UUID) after creation
--
-- STEP 2: Run this SQL with the User ID from Step 1

-- For Platform Admin:
INSERT INTO platform_users (auth_user_id, email, name, role, is_active)
VALUES (
  '<PASTE_AUTH_USER_ID_HERE>',  -- Replace with User ID from Supabase Auth
  'admin@example.com',           -- Replace with actual email
  'Admin Name',                   -- Replace with actual name
  'platform_admin',              -- Role: platform_admin or platform_staff
  true
);

-- For Platform Staff:
-- INSERT INTO platform_users (auth_user_id, email, name, role, is_active)
-- VALUES (
--   '<PASTE_AUTH_USER_ID_HERE>',
--   'staff@example.com',
--   'Staff Name',
--   'platform_staff',
--   true
-- );

-- Verify the user was created:
-- SELECT * FROM platform_users WHERE email = 'admin@example.com';
