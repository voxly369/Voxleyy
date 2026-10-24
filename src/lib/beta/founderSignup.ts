/** Must match public.founder_email() in Postgres (see standing rules). Used only to bypass closed-beta UI for that address. */
export const FOUNDER_SIGNUP_EMAIL = 'voxly369@gmail.com'

export function isFounderSignupEmail(email: string): boolean {
  return email.trim().toLowerCase() === FOUNDER_SIGNUP_EMAIL
}
