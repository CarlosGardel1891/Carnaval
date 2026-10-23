// Se regenera con `pnpm gen:types` (supabase gen types).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
export type Database = { public: { Tables: Record<string, never> } }
export type Tables<T extends string> = T extends never ? never : never
