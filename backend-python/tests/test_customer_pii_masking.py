import pytest
from app.core.privacy import mask_phone, mask_name
from app.services.order_lifecycle import to_partner_order, to_rider_delivery


def test_mask_phone_formats():
    # 10 digits
    assert mask_phone("9876543210") == "+91 98••• ••210"
    # +91 with spaces
    assert mask_phone("+91 98765 43210") == "+91 98••• ••210"
    # raw string with +91
    assert mask_phone("+919876543210") == "+91 98••• ••210"
    # empty or none
    assert mask_phone("") == ""
    assert mask_phone(None) == ""


def test_mask_name():
    assert mask_name("Rahul Sharma") == "Rahul S."
    assert mask_name("Rahul") == "Rahul"
    assert mask_name(None) == "Customer"


def test_order_projections_mask_customer_phone():
    dummy_order = {
        "_id": "ord-test-101",
        "id": "ord-test-101",
        "code": "QP-101",
        "status": "partner_accepted",
        "customerName": "Deepika Singh",
        "customerPhone": "+91 98765 43210",
        "address": {"line": "Civil Lines, Kasganj", "city": "Kasganj", "phone": "+91 98765 43210"},
        "partner": {"name": "Test Cleaners", "phone": "+91 98370 00000"},
        "totals": {"grandTotal": 250},
        "items": [{"name": "Shirt", "qty": 2}],
    }

    # Partner order view
    partner_view = to_partner_order(dummy_order)
    assert partner_view["customerPhone"] == "+91 98••• ••210"
    assert partner_view["customerPhoneMasked"] == "+91 98••• ••210"
    assert partner_view["isNumberMasked"] is True

    # Rider delivery view
    rider_view = to_rider_delivery(dummy_order)
    assert rider_view["customerPhone"] == "+91 98••• ••210"
    assert rider_view["customerPhoneMasked"] == "+91 98••• ••210"
    assert rider_view["isNumberMasked"] is True
    assert rider_view["virtualCallAvailable"] is True
