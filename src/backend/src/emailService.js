import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

function baseHtml(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#050508;">
      <div style="max-width:520px;margin:40px auto;padding:32px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;font-family:'Helvetica Neue',Arial,sans-serif;color:#f3f4f6;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:32px;">🔥</span>
          <h1 style="margin:8px 0 0;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">Vivify</h1>
        </div>
        ${content}
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;font-size:11px;color:#6b7280;">
          You received this email because you have a Vivify account.<br>
          Questions? <a href="mailto:support@vivify.au" style="color:#a78bfa;">support@vivify.au</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendWelcomeEmail(email, username) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const html = baseHtml(`
    <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 8px;">Welcome, ${username}! ⚔️</h2>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Your character has been created. Start building habits, earning XP, and levelling up your discipline.
    </p>
    <div style="background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="color:#c4b5fd;font-size:13px;font-weight:600;margin:0 0 8px;">Getting started:</p>
      <ul style="color:#9ca3af;font-size:13px;line-height:1.8;margin:0;padding-left:16px;">
        <li>Create your first habit on the Dashboard</li>
        <li>Complete habits daily to build streaks and earn XP</li>
        <li>Upgrade to Pro for AI coaching and analytics</li>
      </ul>
    </div>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'https://vivify.au'}/dashboard"
         style="display:inline-block;background:#7c3aed;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Open Vivify →
      </a>
    </div>
  `);

  await transporter.sendMail({
    from: `"Vivify" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Welcome to Vivify, ${username}! 🔥`,
    html,
  });
}

export async function sendStreakRiskEmail(email, username, streak) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const html = baseHtml(`
    <h2 style="font-size:20px;font-weight:800;color:#fff;margin:0 0 8px;">Your ${streak}-day streak is at risk 🔥</h2>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 20px;">
      Hey ${username}, you haven't completed any habits today. Your ${streak}-day streak will be lost at midnight if you don't check in.
    </p>
    <div style="background:rgba(234,88,12,0.15);border:1px solid rgba(234,88,12,0.3);border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
      <p style="font-size:32px;margin:0 0 4px;">🔥 × ${streak}</p>
      <p style="color:#fb923c;font-size:13px;font-weight:700;margin:0;">${streak}-day streak at risk</p>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;margin:0 0 20px;">
      Complete at least one habit before midnight to keep it alive. Even one counts.
    </p>
    <div style="text-align:center;">
      <a href="${process.env.FRONTEND_URL || 'https://vivify.au'}/dashboard"
         style="display:inline-block;background:#ea580c;color:#fff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:12px;text-decoration:none;">
        Protect My Streak →
      </a>
    </div>
  `);

  await transporter.sendMail({
    from: `"Vivify" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Your ${streak}-day streak is at risk 🔥`,
    html,
  });
}
