import re

def extract_intelligent_data(sms_text, sender_id):
    data = {"amount": 0, "payer": "Unknown", "tx_id": None, "provider": "Unknown"}
    sms_clean = sms_text.replace(',', '')

    # CBE Pattern (e.g., credited with ETB 500.00 ... Txn ID: FT2525...)
    if "cbe" in sender_id.lower() or "commercial" in sender_id.lower():
        data["provider"] = "CBE"
        amt_match = re.search(r'ETB\s*([\d\.]+)', sms_clean)
        tx_match = re.search(r'(FT[A-Z0-9]+)', sms_text)
        payer_match = re.search(r'by\s+([A-Z\s]+)', sms_text, re.IGNORECASE)
        
        if amt_match: data["amount"] = float(amt_match.group(1))
        if tx_match: data["tx_id"] = tx_match.group(1)
        if payer_match: data["payer"] = payer_match.group(1).strip()

    # Telebirr Pattern (e.g., Received 100 Birr from ... ID: 8E32...)
    elif "telebirr" in sender_id.lower() or "127" in sender_id:
        data["provider"] = "Telebirr"
        amt_match = re.search(r'(?:Received|transferred)\s+([\d\.]+)\s*Birr', sms_clean, re.IGNORECASE)
        tx_match = re.search(r'ID:\s*([A-Z0-9]+)', sms_text, re.IGNORECASE)
        phone_match = re.search(r'\((\d{10})\)', sms_text)
        
        if amt_match: data["amount"] = float(amt_match.group(1))
        if tx_match: data["tx_id"] = tx_match.group(1)
        if phone_match: data["payer"] = phone_match.group(1)

    return data