# Supabase Storage Setup Guide

This guide will walk you through setting up the Supabase Storage bucket for image uploads in the Tenant Management System.

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Log in to your account
3. Select your project (or create a new one if you haven't already)

## Step 2: Navigate to Storage

1. In the left sidebar, click on **"Storage"**
2. You should see the Storage management interface

## Step 3: Create the Bucket

1. Click the **"New bucket"** button (or **"Create bucket"**)
2. Fill in the bucket details:
   - **Name**: `ticket-images` (must be exactly this name)
   - **Public bucket**: Toggle this to **ON** (Public)
     - This allows the application to access images via public URLs
     - If you prefer private buckets, you'll need to configure RLS policies and use signed URLs
3. Click **"Create bucket"** or **"Save"**

## Step 4: Configure Bucket Settings (Optional but Recommended)

After creating the bucket, you can configure additional settings:

### File Size Limits
1. Click on the `ticket-images` bucket
2. Go to **Settings** or **Policies**
3. You can set file size limits (the app enforces 5MB per file, but you can set a bucket-level limit too)

### CORS Configuration (if needed)
If you encounter CORS errors when uploading images:

1. Go to **Storage** → **Policies** (or **Settings**)
2. Add CORS configuration for your domain
3. Or use Supabase's default CORS settings which should work for most cases

## Step 5: Verify Bucket Creation

1. You should now see `ticket-images` in your list of buckets
2. The bucket should show as **Public**
3. You can test by uploading a file manually through the Supabase dashboard

## Step 6: Test Image Upload in Application

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Log in as a tenant
3. Navigate to "Report a Defect"
4. Try uploading an image
5. If you see an error about the bucket not being found, verify:
   - The bucket name is exactly `ticket-images` (case-sensitive)
   - The bucket is set to Public
   - Your `SUPABASE_SERVICE_ROLE_KEY` is correct in `.env.local`

## Troubleshooting

### Error: "Bucket not found" or "The resource was not found"

**Possible causes:**
1. Bucket name mismatch - must be exactly `ticket-images`
2. Bucket not created yet
3. Wrong Supabase project
4. Incorrect `SUPABASE_SERVICE_ROLE_KEY` in environment variables

**Solutions:**
- Double-check the bucket name in Supabase Dashboard
- Verify you're using the correct Supabase project
- Check your `.env.local` file has the correct `SUPABASE_SERVICE_ROLE_KEY`
- Make sure you've run the migrations (especially migration 004)

### Error: "Permission denied" or "Access denied"

**Possible causes:**
1. Bucket is not set to Public
2. RLS policies are blocking access
3. Service role key doesn't have proper permissions

**Solutions:**
- Set the bucket to Public in bucket settings
- If using private buckets, configure RLS policies or use signed URLs
- Verify your service role key has storage access

### Error: "File too large"

**Possible causes:**
1. File exceeds 5MB limit (enforced by the app)
2. Bucket has a smaller size limit set

**Solutions:**
- The app enforces 5MB per file - use smaller images
- Check bucket settings for size limits
- Consider image compression before upload

### Images not displaying after upload

**Possible causes:**
1. Bucket is private but using public URLs
2. CORS issues
3. Incorrect URL generation

**Solutions:**
- If bucket is private, implement signed URLs (see `lib/storage.js`)
- Check browser console for CORS errors
- Verify the image URLs are being generated correctly

## Alternative: Private Bucket Setup

If you prefer to use a private bucket:

1. Create the bucket as **Private** (not Public)
2. Update `lib/storage.js` to use signed URLs instead of public URLs
3. Configure RLS policies for the bucket
4. Update the code to generate signed URLs when displaying images

Example RLS policy for private bucket:
```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-images');

-- Allow users to read their own images
CREATE POLICY "Users can read images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'ticket-images');
```

## Verification Checklist

- [ ] Bucket `ticket-images` created in Supabase Dashboard
- [ ] Bucket is set to **Public**
- [ ] Bucket appears in Storage list
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in `.env.local`
- [ ] Can upload images through the application
- [ ] Images display correctly after upload
- [ ] No console errors related to storage

## Need Help?

If you continue to experience issues:
1. Check the Supabase documentation: [https://supabase.com/docs/guides/storage](https://supabase.com/docs/guides/storage)
2. Verify all environment variables are correct
3. Check the browser console and server logs for detailed error messages
4. Ensure you're using the latest version of `@supabase/supabase-js`
