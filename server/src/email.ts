import { Resend } from "resend"

type MagicLinkEmail = {
  to: string
  url: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

export async function sendMagicLink({ to, url }: MagicLinkEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error("missing_resend_api_key")

  const fromAddress = process.env.RESEND_FROM ?? "login@updates.getmimex.com"
  const safeUrl = escapeHtml(url)
  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: `Mimex <${fromAddress}>`,
    to,
    subject: "Sign in to Mimex",
    html: `<!doctype html>
<html lang="en">
<body style="margin:0;padding:40px 20px;background:#09090b;color:#fafafa;font-family:Arial,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;border:1px solid #27272a">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #27272a;font:700 13px monospace;letter-spacing:.12em">■ MIMEX</td></tr>
    <tr><td style="padding:36px 28px">
      <h1 style="margin:0 0 14px;font-size:30px;line-height:1.15">Sign in to Mimex</h1>
      <p style="margin:0 0 28px;color:#a1a1aa;line-height:1.6">Use this secure link to continue. It expires in one hour and can only be used once.</p>
      <a href="${safeUrl}" style="display:inline-block;padding:14px 20px;background:#fafafa;color:#09090b;text-decoration:none;font-weight:700">OPEN MIMEX →</a>
      <p style="margin:28px 0 0;color:#71717a;font:11px/1.6 monospace;word-break:break-all">${safeUrl}</p>
    </td></tr>
  </table>
</body>
</html>`,
    text: `Sign in to Mimex: ${url}\n\nThis link expires in one hour. If you did not request it, ignore this email.`,
  })

  if (error) {
    console.error("[email] Resend failed:", error.message)
    throw new Error("magic_link_delivery_failed")
  }
}
