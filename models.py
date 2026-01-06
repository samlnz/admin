# File: models.py
from datetime import datetime
from database import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    telegram_id = db.Column(db.BigInteger, unique=True, nullable=False)
    username = db.Column(db.String(64))
    phone = db.Column(db.String(20))
    balance = db.Column(db.Float, default=0.0)
    games_played = db.Column(db.Integer, default=0)
    games_won = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    referrer_id = db.Column(db.BigInteger, nullable=True)
    
    def __repr__(self):
        return f"<User {self.telegram_id}>"

class Game(db.Model):
    __tablename__ = 'games'
    
    id = db.Column(db.Integer, primary_key=True)
    status = db.Column(db.String(20), default='waiting')  # waiting, active, finished
    entry_price = db.Column(db.Float, nullable=False)
    pool = db.Column(db.Float, default=0.0)
    called_numbers = db.Column(db.Text, default='')  # Store as comma-separated numbers
    winner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    finished_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    participants = db.relationship('GameParticipant', backref='game', lazy=True, cascade="all, delete-orphan")
    winner = db.relationship('User', backref='won_games', lazy=True, foreign_keys=[winner_id])

class GameParticipant(db.Model):
    __tablename__ = 'game_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    cartela_number = db.Column(db.Integer, nullable=False)
    marked_numbers = db.Column(db.Text, default='')  # Store as comma-separated numbers
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('game_id', 'cartela_number', name='unique_cartela_per_game'),
    )
    
    def __repr__(self):
        return f"<Participant {self.user_id} in Game {self.game_id}>"

class Transaction(db.Model):
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(20))  # deposit, withdraw, win, game_entry
    amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, completed, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # For deposits
    deposit_phone = db.Column(db.String(20), nullable=True)
    transaction_id = db.Column(db.String(100), nullable=True)
    sms_text = db.Column(db.Text, nullable=True)
    
    # For withdrawals
    withdrawal_phone = db.Column(db.String(20), nullable=True)
    withdrawal_status = db.Column(db.String(20), nullable=True)  # pending, approved, rejected
    admin_note = db.Column(db.Text, nullable=True)
    
    def __repr__(self):
        return f"<Transaction {self.type} {self.amount}>"