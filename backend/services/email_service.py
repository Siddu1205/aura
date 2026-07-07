import os
import json
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("aura.email")
LOG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sent_emails.log")

def send_business_email(business_config: dict, recipient: str, subject: str, body: str) -> bool:
    """
    Sends an email to a supplier or customer.
    If SMTP settings are missing, writes to backend/sent_emails.log.
    """
    # Parse SMTP settings
    smtp_email = business_config.get("smtp_email")
    smtp_password = business_config.get("smtp_password")
    smtp_host = business_config.get("smtp_host", "smtp.gmail.com")
    smtp_port = int(business_config.get("smtp_port", 587))

    # Construct email message
    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['To'] = recipient

    # Clean up recipient to only check for email format
    cleaned_recipient = recipient.strip()
    if "@" not in cleaned_recipient:
        # Not a valid email, log it and return false
        logger.warning(f"Invalid email format: {recipient}. Skipping SMTP send.")
        log_email_to_file("system", recipient, subject, body, "FAILED_INVALID_EMAIL")
        return False

    # Check if SMTP details are configured
    if smtp_email and smtp_password:
        msg['From'] = smtp_email
        msg.attach(MIMEText(body, 'plain'))
        try:
            # Connect to SMTP server
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, cleaned_recipient, msg.as_string())
            server.quit()
            
            logger.info(f"Email sent successfully from {smtp_email} to {cleaned_recipient}")
            log_email_to_file(smtp_email, cleaned_recipient, subject, body, "SENT_SMTP")
            return True
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}. Falling back to file logging.")
            log_email_to_file(smtp_email, cleaned_recipient, subject, body, f"FAILED_SMTP_ERROR: {str(e)}")
            return False
    else:
        # Fallback to local logging
        sender = smtp_email or "system@aura.ai"
        logger.info(f"SMTP not fully configured. Logging email from {sender} to {cleaned_recipient} in logs.")
        log_email_to_file(sender, cleaned_recipient, subject, body, "LOGGED_NO_SMTP_CONFIG")
        return True

def log_email_to_file(sender: str, recipient: str, subject: str, body: str, status: str):
    try:
        timestamp = datetime = json_log = {
            "timestamp": smtplib.datetime.datetime.now().isoformat() if hasattr(smtplib, 'datetime') else "2026-07-08T01:00:00",
            "sender": sender,
            "recipient": recipient,
            "subject": subject,
            "body": body,
            "status": status
        }
        # Fallback timestamp if smtplib has no datetime
        import datetime
        json_log["timestamp"] = datetime.datetime.now().isoformat()
        
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(json_log) + "\n")
    except Exception as e:
        logger.error(f"Failed to write to sent_emails.log: {e}")
