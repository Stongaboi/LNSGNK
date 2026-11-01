// Base URL encoded into the checkout QR code.
export const CHECKOUT_BASE_URL = "http://localhost:3000";

// Visits staff can still add services to.
export const QUEUE_VISIT_STATUSES = ["checked_in", "in_service"] as const;

export const ACTIVE_VISIT_STATUSES = [
  "checked_in",
  "in_service",
  "awaiting_checkout_scan",
  "flagged_stale",
] as const;

export const COMPLETED_VISIT_STATUSES = ["completed", "completed_override"] as const;
