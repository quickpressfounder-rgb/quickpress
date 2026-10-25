import pytest
from app.core.privacy import mask_customer_address, mask_phone
from app.api.partner import normalize_dob

def test_normalize_dob():
    assert normalize_dob("1992-05-14") == "1992-05-14"
    assert normalize_dob("14-05-1992") == "1992-05-14"
    assert normalize_dob("14/05/1992") == "1992-05-14"
    assert normalize_dob("1992/05/14") == "1992-05-14"
    assert normalize_dob("") == ""

def test_dpdp_customer_address_masking():
    raw_addr = {
        "line": "Flat 402, Block C, Silver Oak Apartments",
        "locality": "Green Glen Layout",
        "city": "Bengaluru",
        "pincode": "560103"
    }
    # When not delivered: exact address visible
    active_addr = mask_customer_address(raw_addr, is_delivered=False)
    assert "Flat 402" in active_addr
    assert "Bengaluru" in active_addr

    # When delivered: exact flat/doorstep masked under DPDP compliance
    delivered_addr = mask_customer_address(raw_addr, is_delivered=True)
    assert "[Doorstep Masked - Delivered]" in delivered_addr
    assert "Flat 402" not in delivered_addr
    assert "Bengaluru" in delivered_addr

def test_string_address_masking_post_delivery():
    str_addr = "House 12, 4th Main Road, Indiranagar, Bengaluru, 560038"
    masked = mask_customer_address(str_addr, is_delivered=True)
    assert "[Doorstep Masked - Delivered]" in masked
    assert "House 12" not in masked
    assert "Indiranagar" in masked
