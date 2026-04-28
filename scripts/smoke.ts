import { randomUUID } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../lib/db/types";
import { nextQuestion } from "../lib/questions/engine";
import type { Answers } from "../lib/questions/definitions";

type LocalSupabaseStatus = {
  ANON_KEY: string;
  API_URL: string;
  SERVICE_ROLE_KEY: string;
};

type AppEnv = {
  NEXT_PUBLIC_SITE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  AI_PROVIDER?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  CLAUDE_MODEL?: string;
  OPENAI_MODEL?: string;
  PUPPETEER_EXECUTABLE_PATH?: string;
};

type CookieRecord = {
  name: string;
  value: string;
};

class CookieJar {
  private readonly cookies = new Map<string, string>();

  getAll(): CookieRecord[] {
    return Array.from(this.cookies.entries()).map(([name, value]) => ({
      name,
      value,
    }));
  }

  setAll(nextCookies: CookieRecord[]) {
    nextCookies.forEach(({ name, value }) => {
      if (value) {
        this.cookies.set(name, value);
        return;
      }

      this.cookies.delete(name);
    });
  }

  toHeader() {
    return this.getAll()
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
  }
}

function parseJsonSuffix<T>(output: string): T {
  const jsonStart = output.indexOf("{");

  if (jsonStart < 0) {
    throw new Error("Could not find JSON output.");
  }

  return JSON.parse(output.slice(jsonStart)) as T;
}

function loadLocalSupabaseStatus(): LocalSupabaseStatus {
  const output = execFileSync(
    "pnpm",
    ["dlx", "supabase@latest", "status", "-o", "json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  return parseJsonSuffix<LocalSupabaseStatus>(output);
}

function buildAppEnv(appUrl: string): AppEnv {
  const explicitUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const explicitAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const explicitServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (explicitUrl && explicitAnonKey && explicitServiceRoleKey) {
    return {
      NEXT_PUBLIC_SITE_URL: appUrl,
      NEXT_PUBLIC_SUPABASE_URL: explicitUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: explicitAnonKey,
      SUPABASE_SERVICE_ROLE_KEY: explicitServiceRoleKey,
      AI_PROVIDER: process.env.AI_PROVIDER,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      CLAUDE_MODEL: process.env.CLAUDE_MODEL,
      OPENAI_MODEL: process.env.OPENAI_MODEL,
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
    };
  }

  const localStatus = loadLocalSupabaseStatus();

  return {
    NEXT_PUBLIC_SITE_URL: appUrl,
    NEXT_PUBLIC_SUPABASE_URL: localStatus.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: localStatus.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: localStatus.SERVICE_ROLE_KEY,
    AI_PROVIDER: process.env.AI_PROVIDER,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CLAUDE_MODEL: process.env.CLAUDE_MODEL,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
  };
}

async function waitForServer(url: string) {
  const deadline = Date.now() + 90_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });

      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Keep polling until the app boots or the deadline expires.
    }

    await delay(1000);
  }

  throw new Error(`Timed out waiting for ${url}.`);
}

function spawnApp(appUrl: string, appEnv: AppEnv) {
  const port = new URL(appUrl).port;
  const server = spawn(
    "pnpm",
    ["exec", "next", "dev", "--hostname", "127.0.0.1", "--port", port],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...appEnv,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const output: string[] = [];
  const capture = (chunk: Buffer) => {
    output.push(chunk.toString("utf8"));

    if (output.length > 80) {
      output.shift();
    }
  };

  server.stdout.on("data", capture);
  server.stderr.on("data", capture);

  return {
    server,
    readOutput() {
      return output.join("");
    },
  };
}

function createAdminClient(appEnv: AppEnv) {
  return createClient<Database>(
    appEnv.NEXT_PUBLIC_SUPABASE_URL,
    appEnv.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function createAuthedClient(appEnv: AppEnv, jar: CookieJar) {
  return createBrowserClient<Database>(
    appEnv.NEXT_PUBLIC_SUPABASE_URL,
    appEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(cookiesToSet) {
          jar.setAll(cookiesToSet);
        },
      },
    },
  );
}

async function createDirector(
  admin: SupabaseClient<Database>,
  appEnv: AppEnv,
  prefix: string,
) {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}@example.com`;
  const password = "password123";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    throw error ?? new Error("Unable to create smoke-test user.");
  }

  const jar = new CookieJar();
  const client = createAuthedClient(appEnv, jar);
  const signIn = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (signIn.error) {
    throw signIn.error;
  }

  return {
    client,
    cookieJar: jar,
    userId: data.user.id,
  };
}

async function createCase(
  directorClient: SupabaseClient<Database>,
  directorId: string,
  familyName: string,
) {
  const { data, error } = await directorClient
    .from("cases")
    .insert({
      director_id: directorId,
      family_name: familyName,
      questionnaire_token: randomUUID().replaceAll("-", ""),
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create smoke-test case.");
  }

  return data;
}

async function fetchPage(url: string, cookieHeader?: string) {
  const response = await fetch(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    redirect: "manual",
  });

  return {
    response,
    body: await response.text(),
  };
}

async function postQuestionAnswer(
  appUrl: string,
  token: string,
  questionKey: string,
  answer: string,
  ip = "203.0.113.10",
) {
  const response = await fetch(`${appUrl}/api/q/${token}/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({
      questionKey,
      answer,
    }),
  });

  return {
    response,
    body: (await response.json().catch(() => null)) as
      | {
          done?: boolean;
          error?: string;
          nextQuestion?: { key: string } | null;
        }
      | null,
  };
}

async function main() {
  const port = process.env.SMOKE_APP_PORT ?? "3101";
  const appUrl = process.env.SMOKE_APP_URL ?? `http://127.0.0.1:${port}`;
  const appEnv = buildAppEnv(appUrl);
  const aiConfigured = Boolean(
    appEnv.ANTHROPIC_API_KEY || appEnv.OPENAI_API_KEY,
  );
  const requireAi = process.env.SMOKE_REQUIRE_AI === "1";
  const admin = createAdminClient(appEnv);
  const spawned = spawnApp(appUrl, appEnv);
  const cleanupUserIds: string[] = [];

  try {
    await waitForServer(`${appUrl}/login`);

    const primaryDirector = await createDirector(admin, appEnv, "smoke-primary");
    const secondaryDirector = await createDirector(
      admin,
      appEnv,
      "smoke-secondary",
    );

    cleanupUserIds.push(primaryDirector.userId, secondaryDirector.userId);

    const primaryCase = await createCase(
      primaryDirector.client,
      primaryDirector.userId,
      "Rivera family",
    );
    const primaryCookie = primaryDirector.cookieJar.toHeader();
    const detailPage = await fetchPage(
      `${appUrl}/cases/${primaryCase.id}`,
      primaryCookie,
    );

    assert.equal(detailPage.response.status, 200);
    assert.match(detailPage.body, new RegExp(primaryCase.questionnaire_token));

    const questionnaireAnswers: Answers = {
      full_name: "Jane Rivera",
      date_of_birth: "March 14, 1942",
      date_of_passing: "April 23, 2026",
      hometown: "Denver, Colorado",
      personality: "private",
      family_left_behind:
        "Two children, four grandchildren, and a wide circle of nieces, nephews, and old friends.",
      favorite_memory:
        "She made Sunday dinners feel like the center of the week and never let anyone leave hungry.",
      passions: "Gardening, church choir, and handwritten birthday cards.",
      service_details:
        "A visitation will be held on Friday at 5 p.m. at Riverside Chapel.",
      wanted_line:
        "She would want to be remembered for making people feel welcome.",
      anything_missing:
        "She also volunteered for years at the local food pantry.",
    };
    const submittedAnswers: Answers = {};

    while (true) {
      const question = nextQuestion(submittedAnswers);

      if (!question) {
        break;
      }

      const answer = questionnaireAnswers[question.key];
      assert.notEqual(answer, undefined, `Missing smoke answer for ${question.key}.`);

      const { response, body } = await postQuestionAnswer(
        appUrl,
        primaryCase.questionnaire_token,
        question.key,
        answer,
      );

      assert.equal(response.status, 200, body?.error ?? `Failed on ${question.key}.`);
      submittedAnswers[question.key] = answer;

      if (question.key === "personality") {
        assert.equal(body?.nextQuestion?.key, "family_left_behind");
      }

      if (body?.done) {
        break;
      }
    }

    const { data: storedResponses, error: storedResponsesError } = await admin
      .from("questionnaire_responses")
      .select("*")
      .eq("case_id", primaryCase.id);

    if (storedResponsesError) {
      throw storedResponsesError;
    }

    assert.ok(
      (storedResponses ?? []).every((row) => row.question_key !== "career"),
      "Career should be skipped for a private questionnaire.",
    );

    const { data: refreshedCase, error: refreshedCaseError } = await admin
      .from("cases")
      .select("status")
      .eq("id", primaryCase.id)
      .single();

    if (refreshedCaseError) {
      throw refreshedCaseError;
    }

    assert.equal(refreshedCase.status, "draft_ready");

    const readyPage = await fetchPage(
      `${appUrl}/cases/${primaryCase.id}`,
      primaryCookie,
    );

    assert.equal(readyPage.response.status, 200);
    assert.match(readyPage.body, /Generate draft/);

    const rateLimitCase = await createCase(
      primaryDirector.client,
      primaryDirector.userId,
      "Limit family",
    );

    let rateLimited = false;
    for (let requestIndex = 0; requestIndex < 70; requestIndex += 1) {
      const { response } = await postQuestionAnswer(
        appUrl,
        rateLimitCase.questionnaire_token,
        "full_name",
        `Attempt ${requestIndex + 1}`,
        "198.51.100.10",
      );

      if (response.status === 429) {
        rateLimited = true;
        assert.ok(response.headers.get("Retry-After"));
        break;
      }
    }

    assert.ok(rateLimited, "Expected the questionnaire endpoint to rate limit repeated submissions.");

    const { data: limitRows, error: limitRowsError } = await admin
      .from("questionnaire_rate_limits")
      .select("*")
      .eq("case_id", rateLimitCase.id);

    if (limitRowsError) {
      throw limitRowsError;
    }

    assert.ok(
      (limitRows ?? []).length > 0,
      "Expected questionnaire rate-limit rows to be recorded.",
    );

    if (aiConfigured) {
      const draftResponse = await fetch(`${appUrl}/api/cases/${primaryCase.id}/draft`, {
        method: "POST",
        headers: {
          cookie: primaryCookie,
        },
      });
      const draftBody = (await draftResponse.json().catch(() => null)) as
        | { error?: string }
        | null;

      assert.equal(
        draftResponse.status,
        200,
        draftBody?.error ?? "Draft generation failed.",
      );
    } else {
      if (requireAi) {
        throw new Error(
          "SMOKE_REQUIRE_AI=1 was set, but no Anthropic or OpenAI credentials were available.",
        );
      }

      const { error: fixtureDraftError } = await admin
        .from("obituary_drafts")
        .upsert(
          {
            case_id: primaryCase.id,
            content:
              "<p>Jane Rivera lived with quiet grace and deep loyalty to the people she loved.</p><p>Her family will remember her Sunday dinners, her handwritten notes, and the steadiness she brought to every room.</p>",
            ai_provider: "fixture",
            model: "fixture-smoke",
          },
          {
            onConflict: "case_id",
          },
        );

      if (fixtureDraftError) {
        throw fixtureDraftError;
      }
    }

    const { data: draftRow, error: draftRowError } = await admin
      .from("obituary_drafts")
      .select("*")
      .eq("case_id", primaryCase.id)
      .single();

    if (draftRowError) {
      throw draftRowError;
    }

    assert.ok(draftRow.content.length > 0, "Expected a draft row after generation.");

    const patchedContent = `${draftRow.content}<p>Her family treasured her steady warmth and humor.</p>`;
    const patchResponse = await fetch(`${appUrl}/api/cases/${primaryCase.id}/draft`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        cookie: primaryCookie,
      },
      body: JSON.stringify({
        content: patchedContent,
      }),
    });
    const patchBody = (await patchResponse.json().catch(() => null)) as
      | { error?: string; saved?: boolean }
      | null;

    assert.equal(
      patchResponse.status,
      200,
      patchBody?.error ?? "Draft save failed.",
    );
    assert.equal(patchBody?.saved, true);

    const { data: auditRows, error: auditRowsError } = await admin
      .from("obituary_edits")
      .select("*")
      .eq("case_id", primaryCase.id);

    if (auditRowsError) {
      throw auditRowsError;
    }

    assert.ok(
      (auditRows ?? []).length > 0,
      "Expected at least one obituary edit audit row.",
    );

    const pdfResponse = await fetch(`${appUrl}/api/cases/${primaryCase.id}/pdf`, {
      headers: {
        cookie: primaryCookie,
      },
    });

    if (pdfResponse.status !== 200) {
      throw new Error(await pdfResponse.text());
    }

    assert.equal(pdfResponse.headers.get("Content-Type"), "application/pdf");

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    assert.equal(pdfBuffer.subarray(0, 4).toString("utf8"), "%PDF");

    const forbiddenPage = await fetchPage(
      `${appUrl}/cases/${primaryCase.id}`,
      secondaryDirector.cookieJar.toHeader(),
    );

    assert.equal(forbiddenPage.response.status, 404);

    console.log(`Smoke test passed against ${appEnv.NEXT_PUBLIC_SUPABASE_URL}.`);

    if (!aiConfigured) {
      console.log(
        "AI generation was not exercised because no provider credentials were available. A fixture draft was inserted to complete edit and PDF verification.",
      );
    }
  } catch (error) {
    console.error("Smoke test failed.");
    console.error(spawned.readOutput());
    throw error;
  } finally {
    spawned.server.kill("SIGTERM");
    await once(spawned.server, "exit").catch(() => undefined);

    for (const userId of cleanupUserIds) {
      await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
