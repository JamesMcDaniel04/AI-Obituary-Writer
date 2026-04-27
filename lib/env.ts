const missingEnv = (name: string) =>
  new Error(`Missing required environment variable: ${name}`);

export function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw missingEnv(name);
  }

  return value;
}
