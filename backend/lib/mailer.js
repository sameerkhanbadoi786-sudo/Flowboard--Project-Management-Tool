import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, APP_URL } = process.env;

// Fallback so the email still renders sensibly before you set your real
// deployed (Vercel) URL in the environment.
const appUrl = APP_URL || "https://flowboard.app";

// Only build a real transporter if SMTP credentials are actually set —
// that way registration keeps working out of the box in dev (the email
// just gets logged to the console instead of sent) and only needs real
// config once you're ready to send real mail.
const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465, // 465 = implicit TLS, 587/others = STARTTLS
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

function welcomeEmailBody(fullName) {
  const text =
    `Hey ${fullName},\n\n` +
    `Welcome to Flowboard! We're really glad to have you on board.\n\n` +
    `Flowboard is the project management tool where you can create projects, ` +
    `organize your work on boards, and track your progress from To Do to Done ` +
    `— with your team right there with you, updating live.\n\n` +
    `Here's what you can do to get started:\n` +
    `  1. Create your first project\n` +
    `  2. Set up a board and add your tasks\n` +
    `  3. Invite your teammates and start collaborating in real time\n\n` +
    `Open Flowboard: ${appUrl}\n\n` +
    `If you ever have questions or feedback, just reply to this email — ` +
    `we'd love to hear from you.\n\n` +
    `Thanks for joining us,\n` +
    `The Flowboard Team`;

  const html = `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:0;color:#1a1a2e;background-color:#f6f6fb;">
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.05);">
        <div style="background:linear-gradient(135deg,#6d63ff,#9d94ff);padding:32px 24px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:28px;height:28px;border-radius:8px;background:rgba(255,255,255,0.9);"></div>
            <span style="font-weight:800;font-size:20px;color:#ffffff;">Flowboard</span>
          </div>
        </div>

        <div style="padding:32px 28px;">
          <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hey ${escapeHtml(fullName)},</p>
          <p style="font-size:17px;line-height:1.6;margin:0 0 16px;"><strong>Welcome to Flowboard!</strong></p>
          <p style="font-size:15px;line-height:1.6;margin:0 0 20px;color:#3a3a4a;">
            We're really glad to have you on board. Flowboard is the project
            management tool where you can create projects, organize your work
            on boards, and track your progress from To&nbsp;Do to Done — with
            your team right there with you, updating live.
          </p>

          <p style="font-size:15px;line-height:1.6;margin:0 0 8px;font-weight:700;">
            Here's how to get started:
          </p>
          <ul style="font-size:15px;line-height:1.8;color:#3a3a4a;margin:0 0 28px;padding-left:20px;">
            <li>Create your first project</li>
            <li>Set up a board and add your tasks</li>
            <li>Invite your teammates and collaborate in real time</li>
          </ul>

          <div style="text-align:center;margin:0 0 28px;">
            <a href="${appUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#6d63ff,#9d94ff);
                      color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;
                      padding:14px 32px;border-radius:10px;">
              Open Flowboard
            </a>
          </div>

          <p style="font-size:13px;line-height:1.6;color:#8a8a99;margin:0;">
            Have questions or feedback? Just reply to this email — we'd love to hear from you.
          </p>
        </div>

        <div style="padding:20px 28px;border-top:1px solid #eeeef5;text-align:center;">
          <p style="font-size:12px;color:#a0a0b0;margin:0;">
            Thanks for joining us,<br/><strong>The Flowboard Team</strong>
          </p>
        </div>
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
// SMTP config can never break account creation.
export async function sendWelcomeEmail(toEmail, fullName) {
  const subject = "Welcome to Flowboard!";
  const { text, html } = welcomeEmailBody(fullName);

  if (!transporter) {
    console.log(
      `[mailer] SMTP isn't configured (see backend/.env.example) — logging the welcome email instead of sending it:\n` +
      `  To: ${toEmail}\n  Subject: ${subject}\n\n${text}\n`
    );
    return { sent: false, reason: "smtp-not-configured" };
  }

  try {
    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: toEmail,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("[mailer] Failed to send welcome email:", err.message);
    return { sent: false, reason: err.message };
  }
}