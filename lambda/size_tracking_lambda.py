import json
import boto3
import datetime
import os

s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
TABLE_NAME = os.environ.get("TABLE_NAME")

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
    """Triggered by S3 events to update bucket size history."""
    bucket_name = event["Records"][0]["s3"]["bucket"]["name"]
    # bucket_name = "test-bucket-ku-2025"
    
    total_size, object_count = get_bucket_size(bucket_name)
    
    timestamp = int(datetime.datetime.utcnow().timestamp())
    table = dynamodb.Table(TABLE_NAME)
    
    table.put_item(
        Item={
            "bucket_name": bucket_name,
            "timestamp": timestamp,
            "total_size": total_size,
            "object_count": object_count
        }
    )

    return {"statusCode": 200, "body": json.dumps("Size tracked successfully!")}