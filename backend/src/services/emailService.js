import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const BREVO_URL = 'https://api.brevo.com/v3';

let transporter;

const getTransporter = () => {
  if (!env.smtp) {
    throw new Error('Email is not configured. Set SMTP_USER, SMTP_PASS and EMAIL_FROM in backend/.env.');
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
};

// "ShopNest <shop@example.com>" -> { name: 'ShopNest', email: 'shop@example.com' }
const parseSender = (from) => {
  const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim() || 'ShopNest', email: match[2].trim() };
  return { name: 'ShopNest', email: from.trim() };
};

const brevoRequest = async (path, { method = 'GET', body } = {}) => {
  const response = await fetch(`${BREVO_URL}${path}`, {
    method,
    headers: {
      'api-key': env.brevoApiKey,
      accept: 'application/json',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = (await response.json()).message ?? '';
    } catch {
      // The error body was not JSON; the status code is enough.
    }
    throw new Error(`Brevo responded with ${response.status}${detail ? `: ${detail}` : ''}`);
  }
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderEmail = ({ name, heading, intro, buttonText, link, outro }) => {
  const safeName = escapeHtml(name);

  const html = `
<div style="background:#fafaf9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#1c1917;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e5e4;border-radius:12px;padding:32px;">
    <p style="margin:0 0 24px;font-size:20px;font-weight:bold;color:#115e59;">ShopNest</p>
    <h1 style="margin:0 0 16px;font-size:20px;">${escapeHtml(heading)}</h1>
    <p style="margin:0 0 12px;line-height:1.5;">Hi ${safeName},</p>
    <p style="margin:0 0 24px;line-height:1.5;">${escapeHtml(intro)}</p>
    <p style="margin:0 0 24px;">
      <a href="${escapeHtml(link)}" style="background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block;font-weight:bold;">${escapeHtml(buttonText)}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#57534e;line-height:1.5;">If the button does not work, copy this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:13px;word-break:break-all;color:#57534e;">${escapeHtml(link)}</p>
    <p style="margin:0;font-size:13px;color:#57534e;line-height:1.5;">${escapeHtml(outro)}</p>
  </div>
</div>`;

  const text = `Hi ${name},\n\n${intro}\n\n${buttonText}: ${link}\n\n${outro}\n`;

  return { html, text };
};

export const sendEmail = async ({ to, subject, text, html, replyTo }) => {
  if (env.brevoApiKey) {
    // Over the web (HTTPS), so it works where SMTP ports are blocked. Brevo takes one body type, so we send the HTML.
    await brevoRequest('/smtp/email', {
      method: 'POST',
      body: {
        sender: parseSender(env.emailFrom),
        to: [{ email: to }],
        subject,
        htmlContent: html,
        ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      },
    });
    return;
  }

  const mailer = getTransporter();
  await mailer.sendMail({ from: env.smtp.from, to, subject, text, html, replyTo });
};

// Checks the email settings and login without sending anything.
export const verifyEmailConnection = async () => {
  if (env.brevoApiKey) {
    await brevoRequest('/account');
    return;
  }
  await getTransporter().verify();
};

export const sendVerificationEmail = async (user, token) => {
  const link = `${env.clientUrls[0]}/verify-email?token=${token}`;
  const { html, text } = renderEmail({
    name: user.name,
    heading: 'Confirm your email address',
    intro: 'Thanks for creating a ShopNest account. Please confirm your email address to finish signing up. This link expires in 24 hours.',
    buttonText: 'Confirm email',
    link,
    outro: 'If you did not create a ShopNest account, you can safely ignore this email.',
  });
  await sendEmail({ to: user.email, subject: 'Confirm your ShopNest email', text, html });
};

export const sendPasswordResetEmail = async (user, token) => {
  const link = `${env.clientUrls[0]}/reset-password?token=${token}`;
  const { html, text } = renderEmail({
    name: user.name,
    heading: 'Reset your password',
    intro: 'We received a request to reset your ShopNest password. Use the button below to choose a new one. This link expires in 1 hour.',
    buttonText: 'Reset password',
    link,
    outro: 'If you did not request this, you can safely ignore this email. Your password will not change.',
  });
  await sendEmail({ to: user.email, subject: 'Reset your ShopNest password', text, html });
};

// A message from the contact form, sent to the store owner. Replying to it goes to the customer.
export const sendContactMessageEmail = async ({ to, name, email, orderNumber, message, signedIn }) => {
  const oneLine = (value) => String(value).replace(/[\r\n]+/g, ' ').trim();
  const subject = `ShopNest contact: ${oneLine(name)}${orderNumber ? ` (order ${oneLine(orderNumber)})` : ''}`;

  const details = [
    ['Name', oneLine(name)],
    ['Email', oneLine(email)],
    ['Order number', orderNumber ? oneLine(orderNumber) : 'not given'],
    ['Has an account', signedIn ? 'yes (signed in)' : 'no or not signed in'],
  ];

  const text = `${details.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\n${message}\n`;
  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;color:#1c1917;max-width:560px;">
  <p style="font-size:18px;font-weight:bold;color:#115e59;margin:0 0 16px;">New message from the ShopNest contact form</p>
  <table style="border-collapse:collapse;margin:0 0 16px;font-size:14px;">
    ${details
      .map(
        ([label, value]) =>
          `<tr><td style="padding:2px 12px 2px 0;color:#57534e;">${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`,
      )
      .join('')}
  </table>
  <p style="white-space:pre-wrap;line-height:1.5;border-left:3px solid #e7e5e4;padding-left:12px;margin:0 0 16px;">${escapeHtml(message)}</p>
  <p style="font-size:12px;color:#78716c;margin:0;">Reply to this email to answer the customer directly.</p>
</div>`;

  await sendEmail({ to, subject, text, html, replyTo: email });
};