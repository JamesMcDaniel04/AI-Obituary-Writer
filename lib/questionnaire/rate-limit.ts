import { createHash } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const DEFAULT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_MAX_REQUESTS = 60;

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    if (firstIp) {
      return firstIp.trim();
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

export async function applyQuestionnaireRateLimit(
  request: Request,
  caseId: string,
) {
  const admin = createAdminSupabaseClient();
  const windowSeconds = parsePositiveInt(
    process.env.QUESTIONNAIRE_RATE_LIMIT_WINDOW_SECONDS,
    DEFAULT_WINDOW_SECONDS,
  );
  const maxRequests = parsePositiveInt(
    process.env.QUESTIONNAIRE_RATE_LIMIT_MAX_REQUESTS,
    DEFAULT_MAX_REQUESTS,
  );
  const ipHash = hashIp(getClientIp(request));

  const { data, error } = await admin.rpc("enforce_questionnaire_rate_limit", {
    p_case_id: caseId,
    p_ip_hash: ipHash,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error) {
    throw error;
  }

  const result = data?.[0];

  if (!result) {
    throw new Error("Rate limit check did not return a result.");
  }

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    resetAt: result.reset_at,
  };
}
