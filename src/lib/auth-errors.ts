const FRIENDLY: Record<string, string> = {
  "Invalid login credentials": "That email and password don't match. Please try again.",
  "Email not confirmed": "Please confirm your email first — check your inbox for the link.",
  "User already registered": "An account with this email already exists. Try signing in instead.",
  "Database error saving new user":
    "We couldn't create your account right now. Please try again in a moment.",
};

export function friendlyAuthError(message: string) {
  return FRIENDLY[message] ?? message;
}
