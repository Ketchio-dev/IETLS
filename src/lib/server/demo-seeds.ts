function isFalseLike(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase());
}

function isTrueLike(value: string | undefined) {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function areDemoSeedsEnabled() {
  const explicit = process.env.IETLS_ENABLE_DEMO_SEEDS;
  if (isTrueLike(explicit)) {
    return true;
  }

  if (isFalseLike(explicit)) {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

