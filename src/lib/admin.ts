// Constant-time comparison of the supplied key against ADMIN_SECRET.
// Used by both the server-rendered /admin page and admin server actions.
export function isValidAdminKey(supplied: string | undefined | null): boolean {
  const expected = process.env.ADMIN_SECRET ?? "";
  if (!expected || !supplied) return false;
  if (supplied.length !== expected.length) return false;
  let result = 0;
  for (let i = 0; i < supplied.length; i++) {
    result |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return result === 0;
}
