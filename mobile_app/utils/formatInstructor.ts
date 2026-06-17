type InstructorLike =
  | string
  | { firstName?: string; lastName?: string; name?: string }
  | null
  | undefined;

/** Normalise instructor from API (string or populated user object) to display text. */
export function formatInstructor(instructor: InstructorLike): string | undefined {
  if (!instructor) return undefined;
  if (typeof instructor === 'string') {
    const trimmed = instructor.trim();
    return trimmed || undefined;
  }
  if (typeof instructor.name === 'string' && instructor.name.trim()) {
    return instructor.name.trim();
  }
  const first = instructor.firstName?.trim() ?? '';
  const last = instructor.lastName?.trim() ?? '';
  const full = `${first} ${last}`.trim();
  return full || undefined;
}
