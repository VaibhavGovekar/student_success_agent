
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load the API key from .env
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("ERROR: API key not found. Check your .env file.")
else:
    try:
        client = OpenAI(api_key=api_key)

        response = client.responses.create(
            model="gpt-4o-mini",
            input="Reply with exactly: OpenAI connection successful!"
        )

        print("SUCCESS: OpenAI API connection works!")
        print("Model response:", response.output_text)

    except Exception as error:
        print("API request failed.")
        print("Error type:", type(error).__name__)
        print("Error details:", str(error))
        print("Check your API key permissions, API access, and billing.")
