import logging
import re
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

# A simple in-memory database of processed Transaction IDs to prevent double-crediting
# In production, replace this with a real database (PostgreSQL/Redis)
processed_transactions = set()

def extract_intelligent_data(sms_text, sender_id):
    """
    Advanced extraction for CBE and Telebirr including TxID and Timestamp.
    """
    data = {
        "amount": None,
        "payer": None,
        "tx_id": None,
        "timestamp": None,
        "provider": "Unknown"
    }
    
    sms_clean = sms_text.replace(',', '') # Handle 1,000.00 -> 1000.00
    
    # === TELEBIRR EXTRACTION ===
    # Format: "Received 100 Birr from ABEBE (0911234567) Transaction ID: 793LTWS... Date: 18-06-2025 10:39:07"
    if "telebirr" in sender_id.lower() or "127" in sender_id:
        data["provider"] = "Telebirr"
        
        # 1. Amount: Looks for "Received [Amount] Birr"
        amt_match = re.search(r'(?:received|transferred)\s+([\d\.]+)\s*Birr', sms_clean, re.IGNORECASE)
        if amt_match: data["amount"] = float(amt_match.group(1))
        
        # 2. Transaction ID: Telebirr IDs are often alphanumeric starting with 7 or 8
        tx_match = re.search(r'Transaction ID:\s*([A-Z0-9]+)', sms_text, re.IGNORECASE)
        if tx_match: data["tx_id"] = tx_match.group(1)
        
        # 3. Payer: Matches phone number in parentheses (09...)
        phone_match = re.search(r'\((\d{10})\)', sms_text)
        if phone_match: data["payer"] = phone_match.group(1)
        
        # 4. Timestamp: 18-06-2025 10:39:07
        time_match = re.search(r'(\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2})', sms_text)
        if time_match: data["timestamp"] = time_match.group(1)

    # === CBE EXTRACTION ===
    # Format: "Acct 1000*** credited with ETB 500.00 on 18-06-2025 10:39:07 by NAME. Txn ID: FT25255G9SZY"
    elif "cbe" in sender_id.lower() or "commercial" in sender_id.lower():
        data["provider"] = "CBE"
        
        # 1. Amount: Looks for "ETB [Amount]"
        amt_match = re.search(r'ETB\s*([\d\.]+)', sms_clean)
        if amt_match: data["amount"] = float(amt_match.group(1))
        
        # 2. Transaction ID: CBE IDs typically start with 'FT'
        tx_match = re.search(r'(FT[A-Z0-9]+)', sms_text)
        if tx_match: data["tx_id"] = tx_match.group(1)
        
        # 3. Payer: "by [Name]"
        payer_match = re.search(r'by\s+([A-Z\s]+?)(?:\.|$)', sms_text, re.IGNORECASE)
        if payer_match: data["payer"] = payer_match.group(1).strip()
        
        # 4. Timestamp
        time_match = re.search(r'(\d{2}-\d{2}-\d{4}\s\d{2}:\d{2}:\d{2})', sms_text)
        if time_match: data["timestamp"] = time_match.group(1)

    return data

@app.route('/webhook/deposit', methods=['POST'])
def handle_deposit():
    incoming = request.json
    sms = incoming.get('raw_sms', '')
    sender = incoming.get('sender', '')
    
    result = extract_intelligent_data(sms, sender)
    
    # --- TRUST & SECURITY CHECKS ---
    
    # 1. Check if Transaction ID was found
    if not result["tx_id"]:
        return jsonify({"status": "error", "message": "Security Alert: Missing Transaction ID"}), 400
    
    # 2. Check for Duplicate (Anti-Fraud)
    if result["tx_id"] in processed_transactions:
        logger.warning(f"🚫 Duplicate attempt for TxID: {result['tx_id']}")
        return jsonify({"status": "error", "message": "Transaction already processed"}), 409
    
    # 3. Final Verification
    if result["amount"] and result["tx_id"]:
        # Success - Add to "Processed" list
        processed_transactions.add(result["tx_id"])
        
        logger.info(f"✅ VERIFIED {result['provider']} DEPOSIT: {result['amount']} Birr | TxID: {result['tx_id']} | User: {result['payer']}")
        
        # Standardizing verification ensures legitimacy and protects against fraud.
        return jsonify({"status": "success", "data": result}), 200
    
    return jsonify({"status": "error", "message": "Incomplete transaction data"}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)