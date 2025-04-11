import time
import os
import boto3
import requests
import logging
from botocore.exceptions import BotoCoreError, ClientError
from requests.exceptions import RequestException

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()

s3_client = boto3.client("s3")
BUCKET_NAME = os.environ.get("BUCKET_NAME")
PLOTTING_API_URL = os.environ.get("PLOTTING_API_URL")

if not PLOTTING_API_URL:
    logger.error("PLOTTING_API_URL environment variable is not set.")
else:
    PLOTTING_API_URL += "/plot"

def lambda_handler(event, context):
    """Driver Lambda for Assignment 4"""

    try:
  
        logger.info("Uploading assignment1.txt")
        s3_client.put_object(Bucket=BUCKET_NAME, Key="assignment1.txt", Body="Empty Assignment 1")
        time.sleep(10)  

       
        logger.info("Uploading assignment2.txt")
        s3_client.put_object(Bucket=BUCKET_NAME, Key="assignment2.txt", Body="Empty Assignment 2222222222")
        time.sleep(20) 

        
        logger.info("Uploading assignment3.txt")
        s3_client.put_object(Bucket=BUCKET_NAME, Key="assignment3.txt", Body="33")
        time.sleep(20)  

        
        if PLOTTING_API_URL:
            logger.info(f"Calling plotting API: {PLOTTING_API_URL}")
            response = requests.get(PLOTTING_API_URL, timeout=100)
            response.raise_for_status()
            logger.info(f"Plotting API Response: {response.text}")

        return {"statusCode": 200, "body": "Driver lambda executed successfully!"}

    except (BotoCoreError, ClientError) as e:
        logger.error(f"S3 operation failed: {e}")
        return {"statusCode": 500, "body": "S3 operation failed"}

    except RequestException as e:
        logger.error(f"Plotting API request failed: {e}")
        return {"statusCode": 500, "body": "Plotting API request failed"}