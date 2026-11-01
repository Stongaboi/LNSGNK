// Temporary mock auth — replace with real Supabase Auth later.
export const MOCK_CLIENT_ID = "11111111-1111-1111-1111-111111111101";
export const MOCK_EMPLOYEE_ID = "11111111-1111-1111-1111-111111111102";
export const MOCK_MANAGER_ID = "11111111-1111-1111-1111-111111111111";

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
