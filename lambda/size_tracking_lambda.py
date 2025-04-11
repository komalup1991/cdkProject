import json
import boto3
import datetime
import os
import logging

s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("TABLE_NAME")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger()


def get_bucket_size(bucket_name):
    """Calculate total size and count of objects in the S3 bucket."""
    total_size = 0
    object_count = 0
    paginator = s3_client.get_paginator("list_objects_v2")
    
    for page in paginator.paginate(Bucket=bucket_name):
        for obj in page.get("Contents", []):
            total_size += obj["Size"]
            object_count += 1

    return total_size, object_count

def lambda_handler(event, context):
    """Triggered by SQS messages to update bucket size history."""
    table = dynamodb.Table(TABLE_NAME)

    for record in event["Records"]:
        try:
            message = json.loads(record["body"])
            logger.info(f"Processing S3 event: {message}")
            
            s3_info = json.loads(message["Message"]) if "Message" in message else message
            bucket_name = s3_info["Records"][0]["s3"]["bucket"]["name"]

            total_size, object_count = get_bucket_size(bucket_name)
            timestamp = int(datetime.datetime.utcnow().timestamp())

            table.put_item(
                Item={
                    "bucket_name": bucket_name,
                    "timestamp": timestamp,
                    "total_size": total_size,
                    "object_count": object_count
                }
            )
        except Exception as e:
            print(f"Error processing record: {e}")
            continue

    return {"statusCode": 200, "body": json.dumps("Size(s) tracked successfully.")}