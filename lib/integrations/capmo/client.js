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
 * LOCKED MINIMAL PAYLOAD for Milestone 3:
 * { source_id, name, description, status: "OPEN" }
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

  // Force uppercase status
  const body = {
    source_id: String(payload.source_id),
    name: String(payload.name),
    description: String(payload.description),
    status: String(payload.status).toUpperCase(),
  };

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
