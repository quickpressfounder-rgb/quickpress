"""
Automated Test Suite for QuickPress Order Completion Email & Invoice PDF Dispatch
Validates:
1. Gmail SMTP Connection & Authentication using official.quickpress@gmail.com
2. Tax Invoice PDF Generation
3. Automated Email Dispatch with PDF attachment & HTML layout
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.email_service import send_order_completion_email, send_smtp_email
from app.db.client import database

async def main():
    print("🚀 Initializing QuickPress Email Automation Test...")

    # 1. Test basic SMTP connectivity
    print("\n--- STEP 1: Testing Gmail SMTP Authentication ---")
    smtp_test = await send_smtp_email(
        to="official.quickpress@gmail.com",
        subject="QuickPress Automated Email Gateway Initialized ✅",
        html="""
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0;">
          <h2 style="color: #047857; margin-top: 0;">QuickPress Automated Email Gateway Active</h2>
          <p style="color: #334155;">Gmail SMTP authentication and TLS connection verified successfully.</p>
          <div style="font-weight: bold; color: #065f46;">Account: official.quickpress@gmail.com</div>
        </div>
        """,
        text="QuickPress Automated Email Gateway Initialized successfully on official.quickpress@gmail.com."
    )
    print(f"SMTP Test Result: {smtp_test}")
    assert smtp_test.get("ok") is True, f"SMTP Connection Failed: {smtp_test}"
    print("✅ STEP 1 PASSED: Gmail SMTP Connection Authenticated Successfully!")

    # 2. Test Order Completion Email with PDF Invoice Attachment
    print("\n--- STEP 2: Testing Order Completion & Tax Invoice PDF Dispatch ---")
    mock_order = {
        "_id": "test_ord_email_001",
        "code": "QP-TEST-9921",
        "userId": "usr_test_9921",
        "customerName": "Test Customer",
        "customerEmail": "official.quickpress@gmail.com",
        "customerPhone": "+919258730561",
        "status": "delivered",
        "serviceLabel": "Premium Steam Iron & Wash",
        "address": {
            "formatted": "011, House 11, Sorn Gate, Kasganj, UP 207123",
            "city": "Kasganj"
        },
        "partner": {
            "name": "Shree Krishna Laundromat & Drycleaners",
            "phone": "+919876543210"
        },
        "rider": {
            "name": "Ankit Sahu (Delivery Captain)",
            "phone": "+919123456789"
        },
        "items": [
            {"name": "Shirt Premium Steam Iron", "qty": 4, "unitPrice": 25.0, "total": 100.0},
            {"name": "Trousers Dry Cleaning", "qty": 2, "unitPrice": 60.0, "total": 120.0},
            {"name": "Bedsheet Deep Wash & Press", "qty": 1, "unitPrice": 150.0, "total": 150.0},
        ],
        "totals": {
            "subtotal": 370.0,
            "discount": 50.0,
            "delivery": 30.0,
            "gst": 35.0,
            "grandTotal": 385.0
        },
        "pricing": {
            "total": 385.0
        },
        "payment": {
            "mode": "online",
            "method": "UPI / QuickPress Wallet",
            "status": "paid",
            "paid": True
        },
        "createdAt": "2026-09-06T18:30:00Z"
    }

    # Save mock order temporarily in database
    await database.insert("customer_orders", mock_order)
    print(f"Created test order #{mock_order['code']} for customer {mock_order['customerEmail']}")

    # Dispatch completion email with PDF invoice attachment
    result = await send_order_completion_email(mock_order)
    print(f"Order Completion Email Dispatch Result: {result}")

    assert result.get("ok") is True, f"Failed to send completion email: {result}"
    print("✅ STEP 2 PASSED: Order Delivered Email with Tax Invoice PDF dispatched successfully!")

    # Cleanup test data
    await database.delete_many("customer_orders", {"_id": "test_ord_email_001"})

    print("\n🎉 ALL EMAIL AUTOMATION & INVOICE PDF TESTS COMPLETED SUCCESSFULLY!\n")

if __name__ == "__main__":
    asyncio.run(main())
