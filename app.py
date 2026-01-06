# File: app.py
import os
import random
import logging
from flask import Flask, jsonify, request, session, render_template, redirect, url_for
from datetime import datetime
from database import db, init_db
from config import SECRET_KEY, FLASK_HOST, FLASK_PORT, WEBAPP_URL
from game_logic import BingoGame
from models import User, Game, GameParticipant, Transaction

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
app.secret_key = SECRET_KEY

# Initialize database
init_db(app)

# Game storage (temporary, will be moved to database)
active_games = {}

@app.route('/')
def index():
    """Redirect to game page"""
    return redirect(f"{WEBAPP_URL}/game.html")

@app.route('/game.html')
def game_page():
    """Serve the main game page"""
    return render_template('game.html')

@app.route('/webhook/deposit', methods=['POST'])
def deposit_webhook():
    """Handle deposit webhook from Tasker or other services"""
    try:
        # Get webhook data
        data = request.get_json()
        logger.info(f"Received deposit webhook: {data}")

        # Validate required fields
        if not data or 'amount' not in data or 'phone' not in data:
            error_msg = 'Invalid webhook data - must include amount and phone'
            logger.error(error_msg)
            return jsonify({'error': error_msg}), 400

        try:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid amount format'}), 400

        # Find user by phone number
        with app.app_context():
            user = User.query.filter_by(phone=data['phone']).first()
            if not user:
                return jsonify({'error': f'No user found with phone: {data["phone"]}'}), 404

            # Find pending transaction
            transaction = Transaction.query.filter_by(
                user_id=user.id,
                type='deposit',
                status='pending',
                amount=amount
            ).order_by(Transaction.created_at.desc()).first()

            if transaction:
                # Approve the deposit
                transaction.status = 'completed'
                transaction.completed_at = datetime.utcnow()

                # Update user balance
                user.balance += amount
                db.session.commit()

                logger.info(f"Deposit approved for user {user.id}: {amount} birr")
                
                return jsonify({
                    'status': 'success',
                    'message': f'Deposit of {amount} birr processed successfully',
                    'new_balance': user.balance
                })
            else:
                return jsonify({'error': 'No pending deposit found'}), 404

    except Exception as e:
        error_msg = str(e)
        logger.exception(f"Error processing webhook: {error_msg}")
        return jsonify({'error': error_msg}), 500

@app.route('/webhook/test', methods=['POST'])
def test_webhook():
    """Test endpoint for webhook validation"""
    try:
        data = request.get_json()
        logger.info(f"Test webhook received: {data}")

        validation = {
            "status": "success",
            "message": "Webhook format is valid",
            "received_data": data,
            "validation": {
                "has_amount": 'amount' in data,
                "has_phone": 'phone' in data,
                "amount_valid": isinstance(data.get('amount'), (int, float)) and data.get('amount') > 0 if 'amount' in data else False,
                "phone_valid": isinstance(data.get('phone'), str) and len(data.get('phone', '')) >= 10 if 'phone' in data else False
            }
        }

        return jsonify(validation)

    except Exception as e:
        logger.error(f"Error in webhook test: {str(e)}")
        return jsonify({
            "status": "error",
            "error": str(e),
            "help": "Make sure to send a POST request with Content-Type: application/json"
        }), 500

@app.route('/api/game/create', methods=['POST'])
def create_game():
    """Create a new game."""
    try:
        data = request.json
        user_id = data.get('user_id')
        entry_price = int(data.get('entry_price', 10))

        if entry_price not in [10, 20, 50, 100]:
            return jsonify({'error': 'Invalid entry price'}), 400

        game_id = len(active_games) + 1
        active_games[game_id] = BingoGame(game_id, entry_price)

        return jsonify({
            'status': 'success',
            'game_id': game_id,
            'entry_price': entry_price,
            'game_url': f"{WEBAPP_URL}/play.html?game_id={game_id}&user_id={user_id}"
        })
        
    except Exception as e:
        logger.exception(f"Error creating game: {str(e)}")
        return jsonify({'error': 'Failed to create game'}), 500

@app.route('/api/game/<int:game_id>/join', methods=['POST'])
def join_game(game_id):
    """Join an existing game."""
    try:
        if game_id not in active_games:
            return jsonify({'error': 'Game not found'}), 404
        
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'User ID required'}), 400
        
        game = active_games[game_id]
        
        # Add player to game
        board = game.add_player(user_id)
        if not board:
            return jsonify({'error': 'Failed to join game'}), 400
        
        return jsonify({
            'status': 'success',
            'game_id': game_id,
            'board': board,
            'players_count': len(game.players),
            'min_players': game.min_players
        })
        
    except Exception as e:
        logger.exception(f"Error joining game: {str(e)}")
        return jsonify({'error': 'Failed to join game'}), 500

@app.route('/api/game/<int:game_id>/status')
def game_status(game_id):
    """Get game status."""
    try:
        if game_id not in active_games:
            return jsonify({'error': 'Game not found'}), 404
        
        game = active_games[game_id]
        
        return jsonify({
            'status': 'success',
            'game_id': game_id,
            'game_status': game.status,
            'players_count': len(game.players),
            'called_numbers': game.called_numbers,
            'winner': game.winner
        })
        
    except Exception as e:
        logger.exception(f"Error getting game status: {str(e)}")
        return jsonify({'error': 'Failed to get game status'}), 500

@app.route('/api/game/<int:game_id>/call', methods=['POST'])
def call_number(game_id):
    """Call the next number."""
    try:
        if game_id not in active_games:
            return jsonify({'error': 'Game not found'}), 404
        
        game = active_games[game_id]
        
        if game.status != "active":
            return jsonify({'error': 'Game not active'}), 400
        
        number = game.call_number()
        if not number:
            return jsonify({'error': 'No more numbers to call'}), 400
        
        return jsonify({
            'status': 'success',
            'number': game.format_number(number),
            'raw_number': number,
            'called_numbers': game.called_numbers,
            'remaining_numbers': len(game.available_numbers)
        })
        
    except Exception as e:
        logger.exception(f"Error calling number: {str(e)}")
        return jsonify({'error': 'Failed to call number'}), 500

@app.route('/api/game/<int:game_id>/mark', methods=['POST'])
def mark_number(game_id):
    """Mark a number on player's board."""
    try:
        if game_id not in active_games:
            return jsonify({'error': 'Game not found'}), 404
        
        data = request.json
        user_id = data.get('user_id')
        number = data.get('number')
        
        if not user_id or not number:
            return jsonify({'error': 'User ID and number required'}), 400
        
        game = active_games[game_id]
        
        if user_id not in game.players:
            return jsonify({'error': 'Player not in game'}), 400
        
        # Mark the number
        success = game.mark_number(user_id, number)
        if not success:
            return jsonify({'error': 'Number not found on board'}), 400
        
        # Check for win
        winner, message = game.check_winner(user_id)
        
        response_data = {
            'status': 'success',
            'marked': True,
            'winner': winner,
            'message': message
        }
        
        if winner:
            game.end_game(user_id)
            response_data['game_status'] = 'finished'
            
            # Record win in database
            with app.app_context():
                user = User.query.filter_by(id=int(user_id)).first()
                if user:
                    user.games_won += 1
                    user.games_played += 1
                    user.balance += game.pool
                    
                    # Create win transaction
                    transaction = Transaction(
                        user_id=user.id,
                        type='win',
                        amount=game.pool,
                        status='completed',
                        completed_at=datetime.utcnow()
                    )
                    db.session.add(transaction)
                    db.session.commit()
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.exception(f"Error marking number: {str(e)}")
        return jsonify({'error': 'Failed to mark number'}), 500

@app.route('/api/user/<int:user_id>/balance')
def user_balance(user_id):
    """Get user balance."""
    try:
        with app.app_context():
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            return jsonify({
                'status': 'success',
                'user_id': user_id,
                'balance': user.balance,
                'username': user.username
            })
            
    except Exception as e:
        logger.exception(f"Error getting user balance: {str(e)}")
        return jsonify({'error': 'Failed to get user balance'}), 500

if __name__ == '__main__':
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=True)