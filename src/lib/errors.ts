type SupabaseLikeError = { code?: string; message?: string } | null | undefined;

/** True when a Supabase/Postgres error means "this table/relation doesn't exist yet." */
export function isMissingTableError(error: SupabaseLikeError): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|schema cache/i.test(error.message ?? "")
  );
}
