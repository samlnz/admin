import os

# Bot Configuration
TELEGRAM_BOT_TOKEN = os.getenv("8502890042:AAG3OO2L-1g1GFz4MUcENizttUvZC1aHspM")
ADMIN_IDS = [int(id) for id in os.getenv("340864668", "").split(",") if id]

# Bank Account Details
BANK_ACCOUNTS = {
    "CBE": {
        "account_number": os.getenv("BANK_ACCOUNT_NUMBER_1", "1000348220032"),
        "account_name": os.getenv("BANK_ACCOUNT_NAME_1", "samson mesfin")
    },
    "Telebirr": {
        "account_number": os.getenv("BANK_ACCOUNT_NUMBER_2", "0976233815"),
        "account_name": os.getenv("BANK_ACCOUNT_NAME_2", "nitsuh")
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
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")

# Database Configuration
SQLALCHEMY_DATABASE_URI ="SQLALCHEMY_DATABASE_URI = "sqlite:///C:/Users/premium/your_database.db""
SQLALCHEMY_TRACK_MODIFICATIONS = False

# Flask Configuration
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))