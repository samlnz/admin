# File: admin_panel.py
from flask import Flask, render_template, request, redirect, url_for, flash, session
from functools import wraps
import os
from config import ADMIN_USERNAME, ADMIN_PASSWORD, SECRET_KEY, FLASK_HOST, FLASK_PORT
from database import db, init_db
from models import User, Game, Transaction

app = Flask(__name__, template_folder='templates/admin')
app.secret_key = SECRET_KEY

# Initialize database
init_db(app)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'admin_logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/admin/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid credentials', 'error')
            
    return render_template('login.html')

@app.route('/admin/logout')
def logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('login'))

@app.route('/admin/dashboard')
@admin_required
def dashboard():
    with app.app_context():
        total_users = User.query.count()
        total_games = Game.query.count()
        active_games = Game.query.filter_by(status='active').count()
        total_transactions = Transaction.query.count()
        pending_withdrawals = Transaction.query.filter_by(type='withdraw', status='pending').count()
        
        recent_transactions = Transaction.query.order_by(Transaction.created_at.desc()).limit(10).all()
        recent_users = User.query.order_by(User.created_at.desc()).limit(10).all()
        
    return render_template('dashboard.html',
                         total_users=total_users,
                         total_games=total_games,
                         active_games=active_games,
                         total_transactions=total_transactions,
                         pending_withdrawals=pending_withdrawals,
                         recent_transactions=recent_transactions,
                         recent_users=recent_users)

@app.route('/admin/users')
@admin_required
def users_list():
    with app.app_context():
        users = User.query.order_by(User.created_at.desc()).all()
    return render_template('users.html', users=users)

@app.route('/admin/transactions')
@admin_required
def transactions_list():
    with app.app_context():
        transactions = Transaction.query.order_by(Transaction.created_at.desc()).all()
    return render_template('transactions.html', transactions=transactions)

@app.route('/admin/withdrawal/approve/<int:transaction_id>', methods=['POST'])
@admin_required
def approve_withdrawal(transaction_id):
    with app.app_context():
        transaction = Transaction.query.get_or_404(transaction_id)
        
        if transaction.type != 'withdraw' or transaction.status != 'pending':
            flash('Invalid transaction', 'error')
            return redirect(url_for('transactions_list'))
        
        user = User.query.get(transaction.user_id)
        if not user:
            flash('User not found', 'error')
            return redirect(url_for('transactions_list'))
        
        # Check if user has sufficient balance
        if user.balance < abs(transaction.amount):
            flash('Insufficient balance', 'error')
            return redirect(url_for('transactions_list'))
        
        # Process withdrawal
        user.balance -= abs(transaction.amount)
        transaction.status = 'completed'
        transaction.completed_at = datetime.utcnow()
        transaction.withdrawal_status = 'approved'
        
        db.session.commit()
        
        flash('Withdrawal approved successfully', 'success')
    
    return redirect(url_for('transactions_list'))

@app.route('/admin/withdrawal/reject/<int:transaction_id>', methods=['POST'])
@admin_required
def reject_withdrawal(transaction_id):
    with app.app_context():
        transaction = Transaction.query.get_or_404(transaction_id)
        
        if transaction.type != 'withdraw' or transaction.status != 'pending':
            flash('Invalid transaction', 'error')
            return redirect(url_for('transactions_list'))
        
        transaction.status = 'failed'
        transaction.withdrawal_status = 'rejected'
        transaction.admin_note = request.form.get('reason', 'Rejected by admin')
        
        db.session.commit()
        
        flash('Withdrawal rejected', 'success')
    
    return redirect(url_for('transactions_list'))

if __name__ == '__main__':
    app.run(host=FLASK_HOST, port=5001, debug=True)  # Different port for admin panel