/** Converts an app name to a URL-safe slug, e.g. "Family Eye" → "family-eye" */
export function toAppSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
