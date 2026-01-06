import requests
import json
import logging
import sys

# --- CONFIGURATION ---
# REPLACE THIS with your actual server URL.
# Examples: 
#   Local: "http://10.64.60.89:5000"
#   Cloud: "https://admin-one-woad-74.vercel.app/game.html"
BASE_URL = "http://127.0.0.1:5000" 

# Configure logging to see clear output
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_deposit_webhook():
    """
    Simulates Tasker sending a deposit notification to your server.
    """
    
    # 1. Define the Endpoint
    # We append /webhook/deposit to the base URL.
    # Ensure your Python server actually has a route defined for this!
    target_url = f"{BASE_URL.rstrip('/')}/webhook/deposit"
    
    logger.info(f"🚀 Starting Test...")
    logger.info(f"🎯 Target URL: {target_url}")

    # 2. Define the Data (The Payload)
    # This matches exactly what Tasker will send.
    payload = {
        "amount": 100.0,      # Ensure this is a number (float/int), not a string
        "phone": "0976233815" # The phone number extracted from SMS
    }
    
    # 3. Define Headers
    # JSON content type is standard for modern webhooks.
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # 4. Send the POST Request
        response = requests.post(
            target_url,
            json=payload,
            headers=headers,
            timeout=10 # Wait max 10 seconds
        )

        # 5. Analyze Response
        print("\n--- SERVER RESPONSE ---")
        print(f"Status Code: {response.status_code}")
        
        try:
            # Try to print the JSON response cleanly
            print("Body:", json.dumps(response.json(), indent=2))
        except json.JSONDecodeError:
            # If server returned plain text or HTML (error page)
            print("Body (Text):", response.text)

        print("-----------------------")

        if response.status_code == 200:
            logger.info("✅ SUCCESS: The server accepted the deposit.")
        elif response.status_code == 404:
            logger.error("❌ ERROR (404): The URL is wrong. Check if '/webhook/deposit' exists in your server code.")
        elif response.status_code == 500:
            logger.error("❌ ERROR (500): The server crashed while processing the data. Check server logs.")
        else:
            logger.warning(f"⚠️ RECEIVED STATUS: {response.status_code}")

    except requests.exceptions.ConnectionError:
        logger.error(f"❌ CONNECTION FAILED: Could not reach {BASE_URL}.")
        logger.error("   -> Is the server running?")
        logger.error("   -> If testing locally, are you using http://127.0.0.1:5000?")
    except Exception as e:
        logger.error(f"❌ UNEXPECTED ERROR: {e}")

if __name__ == "__main__":
    test_deposit_webhook()