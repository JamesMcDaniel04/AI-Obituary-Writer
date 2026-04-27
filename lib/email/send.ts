export function isEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export type SendQuestionnaireLinkArgs = {
  to: string;
  shareUrl: string;
  familyName: string;
  organizationName?: string | null;
};

export async function sendQuestionnaireLinkEmail({
  to,
  shareUrl,
  familyName,
  organizationName,
}: SendQuestionnaireLinkArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Email sending is not configured.");
  }

  const subject = organizationName
    ? `${organizationName} — obituary questions for the ${familyName} family`
    : `Obituary questions for the ${familyName} family`;

  const sender = organizationName ?? "your funeral director";
  const textBody = [
    `Hello,`,
    ``,
    `${sender} has set up a private page to gather a few details for the obituary. Please use the link below when you're ready — it works on a phone or computer, and there's no account to create.`,
    ``,
    shareUrl,
    ``,
    `Take your time. You can come back to it as often as you need.`,
    ``,
    `Thank you.`,
  ].join("\n");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: textBody,
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Email provider rejected the request: ${message}`);
  }

  return (await response.json().catch(() => null)) as {
    id?: string;
  } | null;
}
