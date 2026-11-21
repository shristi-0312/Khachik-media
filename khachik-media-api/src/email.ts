import { Resend } from 'resend'
import { config } from './config.js'

let client: Resend | null = null

function getResend(): Resend {
  if (!config.resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }
  if (!client) client = new Resend(config.resendApiKey)
  return client
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export type ContactInquiry = {
  name: string
  phone: string
  message: string
  source?: string
}

export async function sendContactInquiry(inquiry: ContactInquiry): Promise<{ id: string }> {
  const resend = getResend()
  const name = escapeHtml(inquiry.name)
  const phone = escapeHtml(inquiry.phone)
  const message = escapeHtml(inquiry.message || '(no message)')
  const source = escapeHtml(inquiry.source || 'website')

  const { data, error } = await resend.emails.send({
    from: config.contactFromEmail,
    to: [config.contactToEmail],
    subject: `New inquiry from ${inquiry.name}`,
    text: [
      'New Khachik Media contact inquiry',
      '',
      `Name: ${inquiry.name}`,
      `Phone: ${inquiry.phone}`,
      `Source: ${inquiry.source || 'website'}`,
      '',
      'Message:',
      inquiry.message || '(no message)',
    ].join('\n'),
    html: `
      <h2>New Khachik Media contact inquiry</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Source:</strong> ${source}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replaceAll('\n', '<br />')}</p>
    `,
  })

  if (error) {
    throw new Error(error.message)
  }
  if (!data?.id) {
    throw new Error('Resend did not return an email id')
  }
  return { id: data.id }
}
