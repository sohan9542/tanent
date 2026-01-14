import { supabaseAdmin } from './supabase/server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILES = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/**
 * Validate image file
 */
export function validateImageFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPG, PNG, and WebP are allowed.' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit.` }
  }

  return { valid: true }
}

/**
 * Upload image to Supabase Storage
 * @param {File|Buffer} file - File to upload
 * @param {string} folder - Folder path (e.g., 'tickets', 'pre-tickets')
 * @param {string} filename - Unique filename
 * @returns {Promise<{url: string, path: string, error?: string}>}
 */
export async function uploadImage(file, folder, filename) {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const extension = filename.split('.').pop() || 'jpg'
    const uniqueFilename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`
    const filePath = `${folder}/${uniqueFilename}`

    // Convert File to Buffer if needed
    let fileBuffer
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer()
      fileBuffer = Buffer.from(arrayBuffer)
    } else {
      fileBuffer = file
    }

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('ticket-images')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      })

    if (error) {
      console.error('Storage upload error:', error)
      return { url: null, path: null, error: error.message }
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('ticket-images')
      .getPublicUrl(filePath)

    return {
      url: urlData.publicUrl,
      path: filePath,
      error: null
    }
  } catch (error) {
    console.error('Upload error:', error)
    return { url: null, path: null, error: error.message || 'Upload failed' }
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deleteImage(filePath) {
  try {
    const { error } = await supabaseAdmin.storage
      .from('ticket-images')
      .remove([filePath])

    if (error) {
      console.error('Storage delete error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: error.message || 'Delete failed' }
  }
}

/**
 * Get signed URL for private access (if needed later)
 */
export async function getSignedUrl(filePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('ticket-images')
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      return { url: null, error: error.message }
    }

    return { url: data.signedUrl, error: null }
  } catch (error) {
    return { url: null, error: error.message || 'Failed to generate signed URL' }
  }
}

export { MAX_FILE_SIZE, MAX_FILES, ALLOWED_TYPES }
