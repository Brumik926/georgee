export const PRIMARY_EMAILS = ["lizaktomas@proton.me", "lizaktomas926@gmail.com"] as const;

export function isPrimaryEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (PRIMARY_EMAILS as readonly string[]).includes(email.trim().toLowerCase());
}
