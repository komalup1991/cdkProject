import time
import os
import boto3
import requests
import logging
from botocore.exceptions import BotoCoreError, ClientError
from requests.exceptions import RequestException

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

s3_client = boto3.client("s3")
BUCKET_NAME = os.environ.get("BUCKET_NAME")

PLOTTING_API_URL = os.environ.get("PLOTTING_API_URL")+"/plot"

print(PLOTTING_API_URL)

if not PLOTTING_API_URL:
    logger.error("PLOTTING_API_URL environment variable is not set.")

def lambda_handler(event, context):
    """Perform S3 operations and trigger plotting."""
    
    actions = [
        ("assignment1.txt", "Empty Assignment 1"),
        ("assignment1.txt", "Empty Assignment 2222222222"),
        ("assignment1.txt", None),  # Delete
        ("assignment2.txt", "33")
    ]

    for filename, content in actions:
        try:
            if content:
                logger.info(f"Uploading {filename} to {BUCKET_NAME}")
                s3_client.put_object(Bucket=BUCKET_NAME, Key=filename, Body=content)
            else:
                logger.info(f"Deleting {filename} from {BUCKET_NAME}")
                s3_client.delete_object(Bucket=BUCKET_NAME, Key=filename)
            
            time.sleep(5)  

        except (BotoCoreError, ClientError) as e:
            logger.error(f"S3 operation failed: {e}")
            return {"statusCode": 500, "body": "S3 operation failed"}

    # Call the plotting API
    if PLOTTING_API_URL:
        try:
            logger.info(f"Calling plotting API: {PLOTTING_API_URL}")
            response = requests.get(PLOTTING_API_URL, timeout=100)
            response.raise_for_status()  
            logger.info(f"API Response: {response.text}")
        except RequestException as e:
            logger.error(f"Plotting API request failed: {e}")
            return {"statusCode": 500, "body": "Plotting API request failed"}

    return {"statusCode": 200, "body": "Driver lambda executed successfully!"}

