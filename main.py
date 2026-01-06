# File: main.py
import asyncio
import threading
from app import app
from bot import main as bot_main
from config import FLASK_HOST, FLASK_PORT
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_flask():
    """Run Flask web server"""
    try:
        logger.info(f"Starting Flask server on {FLASK_HOST}:{FLASK_PORT}")
        app.run(host=FLASK_HOST, port=FLASK_PORT, debug=False, use_reloader=False)
    except Exception as e:
        logger.error(f"Flask server error: {e}")

def run_bot():
    """Run Telegram bot"""
    try:
        logger.info("Starting Telegram bot...")
        asyncio.run(bot_main())
    except Exception as e:
        logger.error(f"Bot error: {e}")

if __name__ == "__main__":
    # Run Flask in a separate thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    
    # Run bot in main thread
    run_bot()