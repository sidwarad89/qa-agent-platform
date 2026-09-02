"""
Sends the welcome email on signup. Uses plain SMTP so it works with any
free provider - Gmail (with an App Password), Outlook, Zoho, etc.

Set these env vars on Render for it to actually send anything:
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=youraddress@gmail.com
  SMTP_PASSWORD=<app password, not your normal password>
  FROM_EMAIL=youraddress@gmail.com
  FROM_NAME=QA Agent Builder

If these aren't set, emails are silently skipped - signup still works fine.
"""
import os
import smtplib
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", SMTP_USER)
FROM_NAME = os.getenv("FROM_NAME", "QA Agent Builder")


def _send(to_email: str, subject: str, body: str) -> bool:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD and FROM_EMAIL):
        return False  # not configured - skip quietly

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = f"{FROM_NAME} <{FROM_EMAIL}>"
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, [to_email], msg.as_string())
        return True
    except Exception:
        return False  # never let email failures break signup


def send_welcome_email(to_email: str, username: str) -> bool:
    subject = "Welcome to QA Agent Builder 👋"
    body = (
        f"Hi {username},\n\n"
        "Your QA Agent Builder account is ready.\n\n"
        "Here's what you can do next:\n"
        "  - Build: create an AI QA agent (pick an engine, language, and framework)\n"
        "  - MCP Tools: connect Jira, GitHub, TestRail, and more\n"
        "  - Agentic Process: chain agents together with human-in-the-loop review\n\n"
        "Happy testing!\n"
        "— The QA Agent Builder team"
    )
    return _send(to_email, subject, body)
