/**
 * Shared utility for building Prisma WHERE clauses from audience targeting criteria.
 * Used by segments, polls, and audience match endpoints.
 */

export interface SegmentCriteria {
  ageRange?: string;
  location?: string;
  gender?: string;
  language?: string;
  interests?: string[];
  minScore?: number;
}

const ALLOWED_FIELDS = ['ageRange', 'location', 'gender', 'language', 'interests', 'minScore'] as const;

const VALID_AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const VALID_GENDERS = ['male', 'female', 'non-binary', 'prefer-not-to-say'];

/**
 * Builds a Prisma-compatible WHERE clause from SegmentCriteria.
 */
export function buildWhereClause(criteria: SegmentCriteria): Record<string, unknown> {
  const AND: Record<string, unknown>[] = [];

  if (criteria.ageRange) {
    AND.push({ ageRange: criteria.ageRange });
  }
  if (criteria.location) {
    AND.push({ location: { contains: criteria.location } });
  }
  if (criteria.gender) {
    AND.push({ gender: criteria.gender });
  }
  if (criteria.language) {
    AND.push({ language: criteria.language });
  }
  if (criteria.interests && criteria.interests.length > 0) {
    const interestConditions = criteria.interests.map((interest) => ({
      interests: { contains: interest },
    }));
    AND.push({ OR: interestConditions });
  }
  if (criteria.minScore !== undefined && criteria.minScore > 0) {
    AND.push({ memberScore: { gte: criteria.minScore } });
  }

  return AND.length > 0 ? { AND } : {};
}

/**
 * Validates a SegmentCriteria object. Returns an error message or null if valid.
 */
export function validateCriteria(criteria: Record<string, unknown>): string | null {
  if (!criteria || typeof criteria !== 'object') {
    return 'Criteria object is required';
  }

  const keys = Object.keys(criteria);
  const invalidFields = keys.filter((key) => !ALLOWED_FIELDS.includes(key as typeof ALLOWED_FIELDS[number]));
  if (invalidFields.length > 0) {
    return 'Invalid criteria fields: ' + invalidFields.join(', ');
  }

  if (criteria.ageRange && !VALID_AGE_RANGES.includes(criteria.ageRange as string)) {
    return 'Invalid age range. Must be one of: ' + VALID_AGE_RANGES.join(', ');
  }

  if (criteria.gender && !VALID_GENDERS.includes(criteria.gender as string)) {
    return 'Invalid gender. Must be one of: ' + VALID_GENDERS.join(', ');
  }

  if (criteria.interests && !Array.isArray(criteria.interests)) {
    return 'Interests must be an array';
  }

  if (criteria.minScore !== undefined && (typeof criteria.minScore !== 'number' || criteria.minScore < 0)) {
    return 'minScore must be a non-negative number';
  }

  return null;
}

/**
 * Checks if a criteria object has any active (non-empty) fields.
 */
export function hasActiveCriteria(criteria: SegmentCriteria): boolean {
  return !!(
    criteria.ageRange ||
    criteria.location ||
    criteria.gender ||
    criteria.language ||
    (criteria.interests && criteria.interests.length > 0) ||
    (criteria.minScore !== undefined && criteria.minScore > 0)
  );
}

/**
 * Converts criteria to a human-readable breakdown array.
 */
export function criteriaToBreakdown(criteria: SegmentCriteria): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  if (criteria.ageRange) items.push({ label: 'Age', value: criteria.ageRange });
  if (criteria.location) items.push({ label: 'Location', value: criteria.location });
  if (criteria.gender) items.push({ label: 'Gender', value: criteria.gender });
  if (criteria.language) items.push({ label: 'Language', value: criteria.language });
  if (criteria.minScore) items.push({ label: 'Score ≥', value: String(criteria.minScore) });
  if (criteria.interests && criteria.interests.length > 0) {
    criteria.interests.slice(0, 3).forEach((i) => items.push({ label: 'Interest', value: i }));
    if (criteria.interests.length > 3) items.push({ label: 'Interest', value: `+${criteria.interests.length - 3} more` });
  }
  return items;
}
