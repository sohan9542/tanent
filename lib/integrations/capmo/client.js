// lib/integrations/capmo/client.js
// Full, production-usable Capmo client with:
// - correct base URL + auth header format
// - mandatory Request-Id header (per Capmo examples)
// - robust error parsing + logs-friendly requestId
// - minimal helpers you need for Milestone 3
//
// IMPORTANT: This must only run on the server (API routes / server actions).

import crypto from "crypto";

const CAPMO_BASE_URL = "https://api.capmo.de/api/v1";
const CAPMO_API_KEY = process.env.CAPMO_API_KEY;

/**
 * Determine MIME type from filename
 * @param {string} filename - File name
 * @returns {string} MIME type
 */
function getMimeTypeFromFilename(filename) {
  if (!filename) return "application/octet-stream";
  
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    pdf: "application/pdf",
  };
  
  return mimeTypes[ext] || "application/octet-stream";
}

export class CapmoError extends Error {
  /**
   * @param {string} message
   * @param {number} status
   * @param {any} details
   */
  constructor(message, status, details) {
    super(message);
    this.name = "CapmoError";
    this.status = status;
    this.details = details;
  }
}

function ensureApiKey() {
  if (!CAPMO_API_KEY) {
    throw new CapmoError("CAPMO_API_KEY is missing", 500, null);
  }
}

function isJsonResponse(contentType) {
  return typeof contentType === "string" && contentType.includes("application/json");
}

async function parseResponseBody(res) {
  const contentType = res.headers.get("content-type") || "";
  if (isJsonResponse(contentType)) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}

/**
 * Base request helper for Capmo
 * @param {string} path starts with "/"
 * @param {{method?: string, headers?: Record<string,string>, body?: any, signal?: AbortSignal}} options
 */
export async function capmoRequest(path, options = {}) {
  ensureApiKey();

  if (!path || typeof path !== "string" || !path.startsWith("/")) {
    throw new CapmoError("Capmo request path must start with '/'", 500, { path });
  }

  const requestId = crypto.randomUUID();
  const url = `${CAPMO_BASE_URL}${path}`;

  const method = (options.method || "GET").toUpperCase();

  // If body is provided and is not a string, stringify it
  let body = options.body;
  const hasBody = body !== undefined && body !== null;
  const isAlreadyString = typeof body === "string";

  const headers = {
    Authorization: `Capmo ${CAPMO_API_KEY}`,
    Accept: "application/json",
    "Request-Id": requestId,
    ...(options.headers || {}),
  };

  if (hasBody && !isAlreadyString) {
    body = JSON.stringify(body);
  }
  if (hasBody) {
    // Only set JSON content-type if we're sending JSON.
    // (If later you upload multipart, pass your own content-type and string body/formData.)
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: hasBody ? body : undefined,
    signal: options.signal,
  });

  const parsed = await parseResponseBody(res);

  if (!res.ok) {
    // Capmo docs generally include: { message, errors, type } etc.
    const message =
      (parsed && typeof parsed === "object" && (parsed.message || parsed.error)) ||
      res.statusText ||
      "Capmo API error";

    // Log detailed error information for debugging
    console.error("Capmo API Error:", {
      status: res.status,
      statusText: res.statusText,
      message,
      url,
      method,
      requestId,
      response: parsed,
      errors: parsed?.errors,
    });

    // Include requestId for debugging; never include API key
    throw new CapmoError(message, res.status, {
      requestId,
      url,
      method,
      response: parsed,
    });
  }

  return parsed;
}

// --------- Convenience API wrappers ---------

export async function validateCapmo() {
  return capmoRequest("/validate", { method: "GET" });
}

// Backward-compatible alias used by older routes
export const validate = validateCapmo;

export async function listProjects() {
  return capmoRequest("/projects", { method: "GET" });
}

export async function getProject(projectId) {
  if (!projectId) {
    throw new CapmoError("Missing projectId", 400, null);
  }
  return capmoRequest(`/projects/${projectId}`, { method: "GET" });
}

/**
 * Create a ticket in a Capmo project.
 * Payload: { source_id, name, description, status, category_id?, deadline? }
 */
export async function createProjectTicket(projectId, payload) {
  if (!projectId) {
    throw new CapmoError("Missing projectId for Capmo ticket creation", 400, null);
  }
  if (!payload || typeof payload !== "object") {
    throw new CapmoError("Missing payload for Capmo ticket creation", 400, null);
  }

  // Validate minimal payload shape defensively
  const required = ["source_id", "name", "description", "status"];
  for (const k of required) {
    if (!payload[k]) {
      throw new CapmoError(`Capmo payload missing required field: ${k}`, 400, { payload });
    }
  }

  // Capmo status enum (from docs): OPEN, IN_PROGRESS, SIGNED_OFF, CLOSED
  const allowedStatuses = new Set(["OPEN", "IN_PROGRESS", "SIGNED_OFF", "CLOSED"]);
  if (!allowedStatuses.has(String(payload.status).toUpperCase())) {
    throw new CapmoError(
      `Invalid Capmo status '${payload.status}'. Use one of: ${Array.from(allowedStatuses).join(", ")}`,
      400,
      { payload }
    );
  }

  const body = {
    source_id: String(payload.source_id),
    name: String(payload.name),
    description: String(payload.description),
    status: String(payload.status).toUpperCase(),
  };
  if (payload.category_id != null && payload.category_id !== "") {
    body.category_id = String(payload.category_id);
  }
  if (payload.deadline) {
    body.deadline = String(payload.deadline);
  }

  return capmoRequest(`/projects/${projectId}/tickets`, {
    method: "POST",
    body,
  });
}

export async function getProjectTicket(projectId, ticketId) {
  if (!projectId || !ticketId) {
    throw new CapmoError("Missing projectId or ticketId for Capmo ticket lookup", 400, {
      projectId,
      ticketId,
    });
  }
  return capmoRequest(`/projects/${projectId}/tickets/${ticketId}`, { method: "GET" });
}

// Optional: metadata endpoints (use later when you map categories/tags/types)
export async function listTicketCategories(projectId) {
  if (!projectId) throw new CapmoError("Missing projectId", 400, null);
  return capmoRequest(`/projects/${projectId}/ticket-categories`, { method: "GET" });
}
export async function listTicketTypes(projectId) {
  if (!projectId) throw new CapmoError("Missing projectId", 400, null);
  return capmoRequest(`/projects/${projectId}/ticket-types`, { method: "GET" });
}
export async function listTicketTags(projectId) {
  if (!projectId) throw new CapmoError("Missing projectId", 400, null);
  return capmoRequest(`/projects/${projectId}/ticket-tags`, { method: "GET" });
}

export async function listTicketComments(projectId, ticketId) {
  if (!projectId || !ticketId) throw new CapmoError("Missing projectId or ticketId", 400, null);
  return capmoRequest(`/projects/${projectId}/tickets/${ticketId}/comments`, { method: "GET" });
}

export async function listTicketAttachments(projectId, ticketId) {
  if (!projectId || !ticketId) throw new CapmoError("Missing projectId or ticketId", 400, null);
  return capmoRequest(`/projects/${projectId}/tickets/${ticketId}/attachments`, { method: "GET" });
}

export async function addTicketAttachment(projectId, ticketId, payload) {
  if (!projectId || !ticketId) throw new CapmoError("Missing projectId or ticketId", 400, null);
  return capmoRequest(`/projects/${projectId}/tickets/${ticketId}/attachments`, {
    method: "POST",
    body: payload || {},
  });
}

/**
 * Get upload URL for ticket attachments
 * @param {string} mimeType - MIME type of the file (e.g., 'image/png', 'image/jpeg')
 * @returns {Promise<{upload_url: string, data_path: string, fields: object}>}
 */
export async function getTicketAttachmentUploadUrl(mimeType) {
  if (!mimeType) {
    throw new CapmoError("Missing mimeType for upload URL", 400, null);
  }
  
  // Validate that we have a valid image MIME type (not application/octet-stream)
  const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validImageTypes.includes(mimeType.toLowerCase())) {
    throw new CapmoError(
      `Invalid MIME type for image upload: ${mimeType}. Supported types: ${validImageTypes.join(', ')}`,
      400,
      { mimeType }
    );
  }
  
  try {
    console.log(`[Capmo] Requesting upload URL for MIME type: ${mimeType}`);
    const response = await capmoRequest("/upload/ticket-attachments", {
      method: "POST",
      body: { mime_type: mimeType },
    });
    console.log(`[Capmo] Upload URL response received`);
    return response;
  } catch (error) {
    // Log detailed error information for debugging
    if (error instanceof CapmoError && error.details?.response) {
      console.error("Capmo upload URL error details:", {
        mimeType,
        status: error.status,
        message: error.message,
        errors: error.details.response.errors,
        fullResponse: JSON.stringify(error.details.response, null, 2),
      });
    }
    throw error;
  }
}

/**
 * Upload an image file to Capmo and create attachment
 * @param {string} projectId - Capmo project ID
 * @param {string} ticketId - Capmo ticket ID
 * @param {string} imageUrl - URL of the image (from Supabase)
 * @param {string} filename - Original filename
 * @param {string} mimeType - MIME type of the image (optional, will be inferred from filename)
 * @param {string} sourceId - Optional source ID for the attachment
 * @returns {Promise<object>} Capmo attachment response
 */
export async function uploadImageToCapmoAttachment(
  projectId,
  ticketId,
  imageUrl,
  filename,
  mimeType = null,
  sourceId = null
) {
  if (!projectId || !ticketId || !imageUrl || !filename) {
    throw new CapmoError("Missing required parameters for image upload", 400, {
      projectId,
      ticketId,
      imageUrl,
      filename,
    });
  }

  // Infer MIME type from filename if not provided
  const finalMimeType = mimeType || getMimeTypeFromFilename(filename);
  
  console.log(`[Capmo Upload] Starting upload for ${filename}, MIME type: ${finalMimeType}`);

  try {
    // Step 1: Get upload URL from Capmo
    const uploadUrlResponse = await getTicketAttachmentUploadUrl(finalMimeType);
    console.log(`[Capmo Upload] Got upload URL response:`, uploadUrlResponse);
    const { upload_url, data_path, fields } = uploadUrlResponse?.data || uploadUrlResponse || {};

    if (!upload_url || !data_path) {
      throw new CapmoError("Invalid upload URL response from Capmo", 500, {
        response: uploadUrlResponse,
      });
    }

    // Step 2: Download image from Supabase URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new CapmoError(`Failed to download image from ${imageUrl}`, imageResponse.status, null);
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // Step 3: Upload file to Capmo's upload URL using FormData
    const formData = new FormData();
    
    // Add all fields from Capmo response
    if (fields && typeof fields === "object") {
      for (const [key, value] of Object.entries(fields)) {
        formData.append(key, value);
      }
    }
    
    // Add the file
    const blob = new Blob([imageBuffer], { type: finalMimeType });
    formData.append("file", blob, filename);

    // Upload to Capmo's upload URL (this is a different endpoint, not our API)
    const uploadResponse = await fetch(upload_url, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new CapmoError(
        `Failed to upload file to Capmo: ${errorText}`,
        uploadResponse.status,
        null
      );
    }

    // Step 4: Create attachment using data_path
    const attachmentPayload = {
      name: filename,
      data_path: data_path,
      mime_type: finalMimeType,
    };
    
    if (sourceId) {
      attachmentPayload.source_id = sourceId;
    }

    return await addTicketAttachment(projectId, ticketId, attachmentPayload);
  } catch (error) {
    if (error instanceof CapmoError) {
      throw error;
    }
    throw new CapmoError(`Failed to upload image to Capmo: ${error.message}`, 500, {
      originalError: error.message,
    });
  }
}

/**
 * Utility: Normalize Capmo status for UI display.
 * Keep it simple and aligned with Capmo enum.
 */
export function normalizeCapmoStatus(status) {
  if (!status) return null;
  const s = String(status).trim().toUpperCase();
  const map = {
    OPEN: "Open",
    IN_PROGRESS: "In Progress",
    SIGNED_OFF: "Signed Off",
    CLOSED: "Closed",
  };
  return map[s] || status;
}
