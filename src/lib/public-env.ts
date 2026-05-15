import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url()
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function normalizePublicEnv(input: Record<string, string | undefined>): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_APP_URL:
      input.NEXT_PUBLIC_APP_URL ??
      input.APP_BASE_URL ??
      normalizeVercelUrl(input.VERCEL_URL) ??
      "http://localhost:3000"
  };
}

export function parsePublicEnv(input: Record<string, string | undefined>): PublicEnv {
  const parsed = publicEnvSchema.safeParse(normalizePublicEnv(input));

  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid public environment variables: ${details}`);
  }

  return parsed.data;
}

export const publicEnv = parsePublicEnv(process.env);

function normalizeVercelUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}
