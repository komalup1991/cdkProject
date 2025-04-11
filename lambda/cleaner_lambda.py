import boto3
import os
import json

s3_client = boto3.client("s3")

def get_largest_object(bucket_name):
    """Find the largest object in the bucket."""
    paginator = s3_client.get_paginator("list_objects_v2")
    largest_object = None
    max_size = 0

    for page in paginator.paginate(Bucket=bucket_name):
        for obj in page.get("Contents", []):
            if obj["Size"] > max_size:
                max_size = obj["Size"]
                largest_object = obj["Key"]

    return largest_object, max_size

def delete_object(bucket_name, object_key):
    """Deletes the specified object from S3."""
    s3_client.delete_object(Bucket=bucket_name, Key=object_key)
    print(f"Deleted object: {object_key} from bucket: {bucket_name}")

def lambda_handler(event, context):
    """Triggered by CloudWatch alarm to delete the largest object."""
    try:
        bucket_name = os.environ.get("BUCKET_NAME")
        if not bucket_name:
            raise ValueError("Bucket name is not set in environment variables.")

        largest_object, max_size = get_largest_object(bucket_name)

        if largest_object:
            print(f"Largest object found: {largest_object}, Size: {max_size}")
            delete_object(bucket_name, largest_object)
            return {"statusCode": 200, "body": f"Deleted {largest_object}"}
        else:
            print("No objects found in the bucket.")
            return {"statusCode": 200, "body": "No objects to delete."}

    except Exception as e:
        print(f"Error cleaning bucket: {str(e)}")
        return {"statusCode": 500, "body": json.dumps("Cleaner Lambda failed")}