# File: config.py
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot Configuration
TELEGRAM_BOT_TOKEN = "8502890042:AAG3OO2L-1g1GFz4MUcENizttUvZC1aHspM"
ADMIN_IDS = [340864668]  # Your admin ID

# Bank Account Details
BANK_ACCOUNTS = {
    "CBE": {
        "account_number": "1000348220032",
        "account_name": "samson mesfin"
    },
    "Telebirr": {
        "account_number": "0976233815",
        "account_name": "nitsuh"
    }
}

# Game Configuration
CARTELA_SIZE = 100
MIN_PLAYERS = 2
GAME_PRICES = [10, 20, 50, 100]  # in birr
MIN_GAMES_FOR_WITHDRAWAL = 5
MIN_WINS_FOR_WITHDRAWAL = 1
REFERRAL_BONUS = 20  # in birr

# Admin Panel Configuration
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "doublestar123")
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-12345")

# Database Configuration - SQLite for simplicity
SQLALCHEMY_DATABASE_URI = "sqlite:///addis_bingo.db"
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Flask Configuration
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))

# Web URLs
WEBAPP_URL = "https://admin-one-woad-74.vercel.app"
WEBAPP_BASE_URL = f"{WEBAPP_URL}/game.html"