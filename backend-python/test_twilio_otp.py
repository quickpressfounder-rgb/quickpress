#!/usr/bin/env python3
"""Twilio Gateway Diagnostic & Test Utility for QuickPress.

Usage:
    python3 test_twilio_otp.py [PHONE_NUMBER]

Example:
    python3 test_twilio_otp.py +919876543210
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load local environment
load_dotenv(".env")
load_dotenv("backend-python/.env")

from app.core.twilio_sms import send_twilio_sms_otp, verify_phone_otp_code


async def main():
    phone = sys.argv[1] if len(sys.argv) > 1 else "+919876543210"

    print("==================================================")
    print("🚀 QuickPress Twilio SMS Gateway Diagnostic Tool")
    print("==================================================")

    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    phone_number = os.getenv("TWILIO_PHONE_NUMBER", "").strip()
    verify_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID", "").strip()

    print(f"Twilio Account SID : {sid[:6]}...{sid[-4:]}" if len(sid) > 10 else f"Twilio Account SID : {sid or '(EMPTY)'}")
    print(f"Twilio Auth Token  : {'*' * len(token)}" if token else "Twilio Auth Token  : (EMPTY)")
    print(f"Twilio Phone Number: {phone_number or '(EMPTY)'}")
    print(f"Twilio Verify SID  : {verify_sid or '(EMPTY)'}")
    print("--------------------------------------------------")

    if not sid or not token or (not phone_number and not verify_sid):
        print("❌ Twilio credentials are missing in .env!")
        print("Please configure:")
        print("  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
        print("  TWILIO_AUTH_TOKEN=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy")
        print("  TWILIO_PHONE_NUMBER=+1xxxxxxxxxx  (OR TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxx)")
        print("==================================================")
        return

    print(f"📲 Sending test OTP to {phone}...")
    ok, provider, error = await send_twilio_sms_otp(phone, role="customer")
    if ok:
        print(f"✅ OTP successfully dispatched via provider: {provider}")
        print("Check your mobile phone for the 6-digit SMS verification code!")
    else:
        print(f"❌ Failed to dispatch OTP: {error}")
    print("==================================================")


if __name__ == "__main__":
    asyncio.run(main())
