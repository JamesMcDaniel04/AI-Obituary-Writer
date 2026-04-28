const PUBLIC_ENV = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

const missingEnv = (name: string) =>
  new Error(`Missing required environment variable: ${name}`);

export function getRequiredEnv(name: string): string {
  const value =
    Object.prototype.hasOwnProperty.call(PUBLIC_ENV, name)
      ? PUBLIC_ENV[name as keyof typeof PUBLIC_ENV]
      : process.env[name];

  if (!value) {
    throw missingEnv(name);
  }

  return value;
}
