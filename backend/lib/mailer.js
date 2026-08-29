import { Resend } from "resend";

const { RESEND_API_KEY, RESEND_FROM } = process.env;

// Only build a real client if a key is actually set — that way
// registration keeps working out of the box in dev (the email just gets
// logged to the console instead of sent) and only needs real config once
// you're ready to send real mail.
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// Resend's shared test domain — works immediately with no setup, but until
// you verify your own domain (see resend.com/domains) it can only deliver
// to the email address you signed up to Resend with. Every other recipient
// will be rejected by Resend's API until a real domain is verified.
const DEFAULT_FROM = "Flowboard <onboarding@resend.dev>";

function welcomeEmailBody(fullName) {
  const text =
    `Hey ${fullName},\n\n` +
    `Welcome to Flowboard — we're glad you're here.\n\n` +
    `Flowboard is where you and your team plan work, track progress, and ship ` +
    `together. Here's what you can do right away:\n\n` +
    `• Create a project and get a board with To Do / In Progress / Done lists\n` +
    `• Invite teammates and watch cards move live as everyone works\n` +
    `• Comment, assign, and track progress on every card\n\n` +
    `Open Flowboard: https://flowboard.app\n\n` +
    `If you didn't create this account, you can safely ignore this email.\n\n` +
    `— The Flowboard Team`;

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;background:#ffffff;">

      <!-- Header -->
      <div style="background:linear-gradient(135deg,#4a3fd6,#6d63ff);padding:36px 40px;border-radius:12px 12px 0 0;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,0.22);border:1px solid rgba(255,255,255,0.3);"></div>
          <span style="font-weight:800;font-size:20px;color:#ffffff;letter-spacing:-0.01em;">Flowboard</span>
        </div>
      </div>

      <!-- Body -->
      <div style="padding:40px;border:1px solid #e5e7eb;border-top:none;">
        <p style="font-size:15px;line-height:1.6;color:#1a1c26;margin:0 0 4px;">Hey ${escapeHtml(fullName)},</p>
        <h1 style="font-size:22px;font-weight:800;color:#1a1c26;margin:8px 0 18px;letter-spacing:-0.01em;">Welcome to Flowboard 👋</h1>
        <p style="font-size:15px;line-height:1.65;color:#4b5061;margin:0 0 28px;">
          We're glad you're here. Flowboard is where you and your team plan work,
          track progress, and ship together — with everything updating live as
          you go.
        </p>

        <!-- Feature list -->
        <table role="presentation" width="100%" style="margin-bottom:32px;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;font-size:14px;color:#1a1c26;border-bottom:1px solid #f0f1f6;">
              <strong>Create a project</strong> — get a board with To Do, In Progress, and Done lists instantly.
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:14px;color:#1a1c26;border-bottom:1px solid #f0f1f6;">
              <strong>Invite your team</strong> — cards move live for everyone, no refresh needed.
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:14px;color:#1a1c26;">
              <strong>Comment and assign</strong> — keep every task owned and on track.
            </td>
          </tr>
        </table>

        <!-- CTA -->
        <table role="presentation" width="100%" style="margin-bottom:8px;">
          <tr>
            <td>
              <a href="https://flowboard.app" style="display:inline-block;background:#6d63ff;color:#ffffff;font-weight:700;font-size:14px;padding:13px 26px;border-radius:8px;text-decoration:none;">
                Open Flowboard →
              </a>
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer -->
      <div style="padding:24px 40px;text-align:center;">
        <p style="font-size:12.5px;color:#8a8ea3;line-height:1.6;margin:0;">
          You're receiving this because you created a Flowboard account.<br/>
          If this wasn't you, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  return { text, html };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Fire-and-forget from the caller's point of view: this never throws —
// failures are logged and reported back via the return value, so a broken
// Resend config can never break account creation.
export async function sendWelcomeEmail(toEmail, fullName) {
  const subject = "Welcome to Flowboard!";
  const { text, html } = welcomeEmailBody(fullName);

  if (!resend) {
    console.log(
      `[mailer] RESEND_API_KEY isn't set (see backend/.env.example) — logging the welcome email instead of sending it:\n` +
      `  To: ${toEmail}\n  Subject: ${subject}\n\n${text}\n`
    );
    return { sent: false, reason: "resend-not-configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM || DEFAULT_FROM,
      to: toEmail,
      subject,
      text,
      html,
    });

    if (error) {
      console.error("[mailer] Resend rejected the email:", error.message || error);
      return { sent: false, reason: error.message || "resend-error" };
    }

    return { sent: true, id: data?.id };
  } catch (err) {
    console.error("[mailer] Failed to send welcome email:", err.message);
    return { sent: false, reason: err.message };
  }
}