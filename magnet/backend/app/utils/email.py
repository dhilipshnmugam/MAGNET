"""
Email Service
=============
SMTP-based email sending for notifications.
Falls back gracefully if SMTP is not configured.
"""
import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from html import escape as html_escape
from app.config import settings

logger = logging.getLogger("magnet.email")


def _send_smtp(msg: MIMEMultipart, to: str) -> None:
    """Synchronous SMTP send, intended to be called via asyncio.to_thread."""
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASS)
        server.sendmail(settings.EMAIL_FROM, to, msg.as_string())


async def send_email(to: str, subject: str, body: str, html: str = None) -> bool:
    """Send an email notification. Returns True on success."""
    if not settings.SMTP_USER or not settings.SMTP_PASS:
        logger.debug("SMTP not configured, skipping email")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject

        msg.attach(MIMEText(body, "plain"))
        if html:
            msg.attach(MIMEText(html, "html"))

        await asyncio.to_thread(_send_smtp, msg, to)

        logger.info(f"Email sent to {to}: {subject}")
        return True

    except Exception as e:
        logger.warning(f"Email send failed to {to}: {e}")
        return False


async def send_approval_email(to: str, status: str, review_note: str = None) -> bool:
    """Send approval/rejection email with HTML template."""
    is_approved = status == "approved"
    color = "#22c55e" if is_approved else "#ef4444"
    title = "Request Approved" if is_approved else "Request Rejected"
    message = "Your registration request has been approved." if is_approved else "Your registration request has been rejected."
    if review_note:
        message += f"\n\nNote: {review_note}"

    escaped_message = html_escape(message)

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: {color}; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">{title}</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">{escaped_message}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 13px;">This is an automated notification from Magnet - College Communication Platform.</p>
        </div>
    </body>
    </html>
    """

    plain = f"{title}\n\n{message}\n\n---\nMagnet - College Communication Platform"
    return await send_email(to, f"Magnet: {title}", plain, html)


async def send_event_reminder_email(to: str, event_title: str, event_date: str, venue: str = None) -> bool:
    """Send event reminder email."""
    escaped_event_title = html_escape(event_title)
    escaped_venue = html_escape(venue) if venue else None
    venue_line = f"<p><strong>Venue:</strong> {escaped_venue}</p>" if escaped_venue else ""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #6366f1; color: white; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Event Reminder</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="color: #1f2937; margin-top: 0;">{escaped_event_title}</h2>
            <p><strong>Date:</strong> {event_date}</p>
            {venue_line}
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 13px;">Magnet - College Communication Platform</p>
        </div>
    </body>
    </html>
    """

    plain = f"Event Reminder: {event_title}\nDate: {event_date}\n{f'Venue: {venue}' if venue else ''}\n\n---\nMagnet"
    return await send_email(to, f"Magnet: Event Reminder - {event_title}", plain, html)


async def send_verification_email(to: str, token: str) -> bool:
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    return await send_email(to, "Magnet: Verify Your Email", 
        f"Click to verify: {verification_url}",
        f"<a href='{verification_url}'>Verify Email</a>")

async def send_password_reset_email(to: str, token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    return await send_email(to, "Magnet: Reset Your Password",
        f"Reset link: {reset_url}",
        f"<a href='{reset_url}'>Reset Password</a>")
