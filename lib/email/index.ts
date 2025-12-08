import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM || 'A Year\'s History <noreply@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendBookCompleteEmail(
  userEmail: string,
  bookId: string,
  bookName: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping email to:', userEmail);
    return false;
  }

  const bookUrl = `${APP_URL}?book=${bookId}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Your book "${bookName}" is ready!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Georgia, serif; line-height: 1.6; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            h1 { font-family: 'Cinzel', Georgia, serif; color: #1e293b; font-size: 28px; margin-bottom: 20px; }
            .highlight { color: #b45309; }
            .button {
              display: inline-block;
              background: #1e293b;
              color: white !important;
              padding: 14px 28px;
              text-decoration: none;
              font-weight: 500;
              margin: 20px 0;
            }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Your Chronicle is <span class="highlight">Complete</span></h1>

            <p>Great news! Your personalized history book for <strong>${bookName}</strong> has been generated.</p>

            <p>Your book contains <strong>365 unique historical entries</strong>, one for every day of the year, each carefully curated to match your interests.</p>

            <a href="${bookUrl}" class="button">View Your Book</a>

            <p>From ancient wonders to modern marvels, each entry connects the rich tapestry of human history to the story of your life.</p>

            <div class="footer">
              <p>A Year's History Of — Your personal journey through time.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log('[Email] Book complete email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send book complete email:', error);
    return false;
  }
}

export async function sendBookFailedEmail(
  userEmail: string,
  bookName: string
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend not configured, skipping failure email to:', userEmail);
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: userEmail,
      subject: `Issue with your book "${bookName}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Georgia, serif; line-height: 1.6; color: #1e293b; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            h1 { font-family: 'Cinzel', Georgia, serif; color: #1e293b; font-size: 28px; margin-bottom: 20px; }
            .highlight { color: #dc2626; }
            .button {
              display: inline-block;
              background: #1e293b;
              color: white !important;
              padding: 14px 28px;
              text-decoration: none;
              font-weight: 500;
              margin: 20px 0;
            }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Generation <span class="highlight">Issue</span></h1>

            <p>We encountered an issue while generating your book for <strong>${bookName}</strong>.</p>

            <p>Don't worry — you can try generating your book again from your dashboard. Our team has been notified and is looking into this.</p>

            <a href="${APP_URL}/my-books" class="button">Go to My Books</a>

            <div class="footer">
              <p>A Year's History Of — Your personal journey through time.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log('[Email] Book failed email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send book failed email:', error);
    return false;
  }
}
