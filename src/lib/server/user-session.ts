export const USER_ID_COOKIE_NAME = 'ielts_uid';
const DEFAULT_FALLBACK_USER_ID = 'local-dev-user';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function createUserId() {
  return crypto.randomUUID();
}

export function buildUserIdCookieValue() {
  return createUserId();
}

export function getFallbackUserId() {
  return process.env.IETLS_DEFAULT_USER_ID ?? DEFAULT_FALLBACK_USER_ID;
}

export async function getPersistedUserId() {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const userId = cookieStore.get(USER_ID_COOKIE_NAME)?.value?.trim();
    return userId || getFallbackUserId();
  } catch {
    return getFallbackUserId();
  }
}

export function getUserIdCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR_IN_SECONDS,
  };
}
