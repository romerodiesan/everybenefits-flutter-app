import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";

const resendApiKey = defineSecret("RESEND_API_KEY");

const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() || "Pulse <noreply@everybenefits.us>";
const PULSE_WEB_BASE =
  process.env.PULSE_WEB_BASE?.trim() || "https://pulse.everybenefits.us";

function absoluteHref(href: string): string {
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  const path = href.startsWith("/") ? href : `/${href}`;
  return `${PULSE_WEB_BASE.replace(/\/$/, "")}${path}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const sendMailOutbox = onDocumentCreated(
  {
    document: "mailOutbox/{id}",
    secrets: [resendApiKey],
  },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    if (data.status && data.status !== "pending") return;

    let apiKey = "";
    try {
      apiKey = resendApiKey.value().trim();
    } catch {
      apiKey = "";
    }
    if (!apiKey) {
      await snap.ref.set(
        {
          status: "skipped",
          error: "RESEND_API_KEY missing",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const to = String(data.to ?? "").trim();
    const title = String(data.title ?? "Pulse").slice(0, 120);
    const body = String(data.body ?? "").slice(0, 500);
    const href = absoluteHref(String(data.href ?? "/notifications"));
    if (!to.includes("@")) {
      await snap.ref.set(
        {
          status: "failed",
          error: "invalid-to",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return;
    }

    const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
  <p style="font-size:16px;font-weight:600;margin:0 0 8px">${escapeHtml(title)}</p>
  <p style="margin:0 0 16px;color:#444">${escapeHtml(body)}</p>
  <p><a href="${escapeHtml(href)}" style="color:#0B6E4F">Open in Pulse</a></p>
  <p style="margin-top:24px;font-size:12px;color:#888">You can change email alerts in Profile → Notifications.</p>
</body></html>`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: EMAIL_FROM,
          to: [to],
          subject: title,
          html,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        await snap.ref.set(
          {
            status: "failed",
            error: detail.slice(0, 500),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        return;
      }
      const json = (await res.json()) as { id?: string };
      await snap.ref.set(
        {
          status: "sent",
          providerId: json.id ?? null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      await snap.ref.set(
        {
          status: "failed",
          error: err instanceof Error ? err.message.slice(0, 500) : "send-failed",
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }
  },
);
