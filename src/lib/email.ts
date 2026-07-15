// ─── EmailJS Configuration ────────────────────────────────────────────────────
// To enable real email sending:
// 1. Sign up free at https://www.emailjs.com
// 2. Create a service (Gmail, Outlook, etc.)
// 3. Create an email template with variables: {{to_email}}, {{to_name}}, {{code}}, {{type}}
// 4. Replace the placeholder values below with your real credentials
// ─────────────────────────────────────────────────────────────────────────────

const EMAILJS_SERVICE_ID = 'service_u8nns7i';
const EMAILJS_TEMPLATE_ID = 'template_5qv9uzo';
const EMAILJS_PUBLIC_KEY = 'FUPQG4pDp8EBnJ8ZG';

const EMAIL_CONFIGURED =
  EMAILJS_SERVICE_ID.length > 0 &&
  EMAILJS_TEMPLATE_ID.length > 0 &&
  EMAILJS_PUBLIC_KEY.length > 0;

export interface EmailParams {
  to_email: string;
  to_name: string;
  code: string;
  type: 'login' | 'withdrawal' | 'register' | 'password_reset';
}

export async function sendCodeEmail(params: EmailParams): Promise<boolean> {
  // IMPORTANT: Withdrawal codes are NEVER auto-sent via email
  // They must be manually provided by admin for security
  if (params.type === 'withdrawal') {
    console.info('[Email] Withdrawal codes are admin-only, not sent via email');
    return false;
  }

  if (!EMAIL_CONFIGURED) {
    console.info('[Email] Not configured — code must be sent manually from admin panel:', params.code);
    return false;
  }

  const typeLabel = params.type === 'login'
    ? 'Login Verification'
    : params.type === 'register'
    ? 'Email Verification'
    : params.type === 'password_reset'
    ? 'Password Reset'
    : 'Withdrawal Confirmation';

  const subject = params.type === 'login'
    ? `Your Quantumspacex login code: ${params.code}`
    : params.type === 'register'
    ? `Verify your Quantumspacex account: ${params.code}`
    : params.type === 'password_reset'
    ? `Reset your Quantumspacex password: ${params.code}`
    : `Your Quantumspacex withdrawal code: ${params.code}`;

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: params.to_email,
          to_name: params.to_name,
          code: params.code,
          type: typeLabel,
          subject,
        },
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('[Email] Failed to send:', err);
    return false;
  }
}

// ─── Alert Emails (trade & deposit notifications) ────────────────────────────
export interface AlertEmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
}

export async function sendAlertEmail(params: AlertEmailParams): Promise<boolean> {
  if (!EMAIL_CONFIGURED) {
    console.info('[Email] Alert email not configured, skipping:', params.subject);
    return false;
  }
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: {
          to_email: params.to_email,
          to_name: params.to_name,
          code: params.body,
          type: params.subject,
          subject: params.subject,
        },
      }),
    });
    return response.ok;
  } catch (err) {
    console.error('[Email] Alert failed:', err);
    return false;
  }
}
