from flask import request, jsonify, current_app as app
from . import db
from .models import Transaction
from .utils import extract_intelligent_data
import logging

logger = logging.getLogger(__name__)

@app.route('/webhook/deposit', methods=['POST'])
def handle_deposit():
    data = request.json
    sms_text = data.get('raw_sms', '')
    sender_id = data.get('sender', '')

    # 1. Extract Data intelligently (TxID, Amount, etc.)
    extracted = extract_intelligent_data(sms_text, sender_id)
    
    # 2. Trust Validation: Ensure we have a Transaction ID
    if not extracted['tx_id']:
        return jsonify({"status": "error", "message": "Transaction ID missing"}), 400

    # 3. Security Check: Prevent Duplicates (Idempotency)
    existing_tx = Transaction.query.filter_by(tx_id=extracted['tx_id']).first()
    if existing_tx:
        return jsonify({"status": "error", "message": "Transaction already processed"}), 409

    # 4. Save to Database
    try:
        new_tx = Transaction(
            tx_id=extracted['tx_id'],
            amount=extracted['amount'],
            payer=extracted['payer'],
            provider=extracted['provider']
        )
        db.session.add(new_tx)
        db.session.commit()
        
        logger.info(f"✅ VERIFIED: {extracted['amount']} from {extracted['payer']} (ID: {extracted['tx_id']})")
        return jsonify({"status": "success", "message": "Deposit verified"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 500