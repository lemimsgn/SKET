// Simple scaffold for delivering password reset tokens out-of-band.
// In production, replace with an SMS/email provider integration (Twilio, SendGrid, SES, etc.).
export async function sendPasswordResetToken(phone: string, token: string) {
  // Prefer SMS if TWILIO env vars exist — otherwise fall back to logging.
  const twilioAccount = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;

  const message = `Your password reset token: ${token}`;

  if (twilioAccount && twilioAuth && twilioFrom) {
    // Lazy require to avoid adding Twilio as a hard dependency unless configured.
    try {
      const requireFn = eval("require");
      const Twilio = requireFn("twilio");
      const client = Twilio(twilioAccount, twilioAuth);
      await client.messages.create({ body: message, from: twilioFrom, to: phone });
      return { ok: true, method: "sms" };
    } catch (e) {
      console.warn("Failed to send reset token via Twilio:", e);
      return { ok: false, error: String(e) };
    }
  }

  // No provider configured — log token for out-of-band manual delivery.
  console.info(`Password reset token for ${phone}: ${token}`);
  return { ok: true, method: "log" };
}
