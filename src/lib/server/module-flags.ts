const TRUE_ENV_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_ENV_VALUES = new Set(['0', 'false', 'no', 'off']);

function resolveBooleanEnv(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (TRUE_ENV_VALUES.has(normalized)) {
    return true;
  }

  if (FALSE_ENV_VALUES.has(normalized)) {
    return false;
  }

  return null;
}

export function isSpeakingAlphaEnabled() {
  const configured = resolveBooleanEnv(process.env.IETLS_ENABLE_SPEAKING_ALPHA);

  if (configured != null) {
    return configured;
  }

  return process.env.NODE_ENV !== 'production';
}
