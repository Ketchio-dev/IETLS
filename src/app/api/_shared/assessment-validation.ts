import type { SubmitReadingAssessmentInput } from '@/lib/services/reading/types';
import type { SubmitSpeakingAssessmentInput } from '@/lib/services/speaking/types';

const MAX_READING_SET_ID_LENGTH = 120;
const MAX_READING_ANSWER_COUNT = 80;
const MAX_READING_ANSWER_KEY_LENGTH = 120;
const MAX_READING_ANSWER_VALUE_LENGTH = 300;
const MAX_READING_TIME_SPENT_SECONDS = 7_200;

const MAX_SPEAKING_PROMPT_ID_LENGTH = 120;
const MAX_SPEAKING_TRANSCRIPT_LENGTH = 10_000;
const MAX_SPEAKING_DURATION_SECONDS = 900;
const MAX_AUDIO_FILE_NAME_LENGTH = 240;
const MAX_AUDIO_MIME_TYPE_LENGTH = 120;
const MAX_AUDIO_FILE_SIZE_BYTES = 50 * 1024 * 1024;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoundedString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

export function validateReadingAssessmentPayload(body: unknown): body is SubmitReadingAssessmentInput {
  if (!isPlainObject(body)) {
    return false;
  }

  if (!isBoundedString(body.setId, MAX_READING_SET_ID_LENGTH)) {
    return false;
  }

  if (!isPlainObject(body.answers)) {
    return false;
  }

  const answerEntries = Object.entries(body.answers);
  if (answerEntries.length > MAX_READING_ANSWER_COUNT) {
    return false;
  }

  if (
    answerEntries.some(
      ([questionId, answer]) =>
        questionId.trim().length === 0 ||
        questionId.length > MAX_READING_ANSWER_KEY_LENGTH ||
        typeof answer !== 'string' ||
        answer.length > MAX_READING_ANSWER_VALUE_LENGTH,
    )
  ) {
    return false;
  }

  if (
    typeof body.timeSpentSeconds !== 'undefined' &&
    (!isFiniteNumber(body.timeSpentSeconds) ||
      Number(body.timeSpentSeconds) < 0 ||
      Number(body.timeSpentSeconds) > MAX_READING_TIME_SPENT_SECONDS)
  ) {
    return false;
  }

  return true;
}

function validateSpeakingAudioArtifact(value: unknown) {
  if (typeof value === 'undefined') {
    return true;
  }

  if (!isPlainObject(value)) {
    return false;
  }

  const sizeBytes = typeof value.sizeBytes === 'number' ? value.sizeBytes : Number.NaN;
  if (
    !isBoundedString(value.fileName, MAX_AUDIO_FILE_NAME_LENGTH) ||
    !isBoundedString(value.mimeType, MAX_AUDIO_MIME_TYPE_LENGTH) ||
    !isFiniteNumber(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_AUDIO_FILE_SIZE_BYTES
  ) {
    return false;
  }

  const durationSeconds = value.durationSeconds;
  if (
    typeof durationSeconds !== 'undefined' &&
    durationSeconds !== null &&
    (!isFiniteNumber(durationSeconds) ||
      Number(durationSeconds) < 0 ||
      Number(durationSeconds) > MAX_SPEAKING_DURATION_SECONDS)
  ) {
    return false;
  }

  return true;
}

export function validateSpeakingAssessmentPayload(body: unknown): body is SubmitSpeakingAssessmentInput {
  if (!isPlainObject(body)) {
    return false;
  }

  if (!isBoundedString(body.promptId, MAX_SPEAKING_PROMPT_ID_LENGTH)) {
    return false;
  }

  if (
    typeof body.transcript !== 'string' ||
    body.transcript.trim().length === 0 ||
    body.transcript.length > MAX_SPEAKING_TRANSCRIPT_LENGTH
  ) {
    return false;
  }

  if (
    typeof body.durationSeconds !== 'undefined' &&
    (!isFiniteNumber(body.durationSeconds) ||
      Number(body.durationSeconds) < 0 ||
      Number(body.durationSeconds) > MAX_SPEAKING_DURATION_SECONDS)
  ) {
    return false;
  }

  return validateSpeakingAudioArtifact(body.audioArtifact);
}
