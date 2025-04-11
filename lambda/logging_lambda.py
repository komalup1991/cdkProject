import json
import boto3
import os
import sys
import logging
from datetime import datetime, timedelta
from botocore.exceptions import ClientError

# === Custom logger that prints only message ===
logger = logging.getLogger()
logger.setLevel(logging.INFO)

for handler in logger.handlers:
    logger.removeHandler(handler)

handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter('%(message)s')  
handler.setFormatter(formatter)
logger.addHandler(handler)

logs_client = boto3.client("logs")

def get_object_size_from_logs(log_group_name, object_key):
    try:
        start_time = int((datetime.now() - timedelta(days=1)).timestamp() * 1000)
        next_token = None

        while True:
            kwargs = {
                "logGroupName": log_group_name,
                "filterPattern": f'{{ $.object_name = "{object_key}" }}',
                "startTime": start_time
            }
            if next_token:
                kwargs["nextToken"] = next_token

            response = logs_client.filter_log_events(**kwargs)

            # logger.warning("CloudWatch Logs Response:\n%s", json.dumps(response, indent=2))

            for event in response.get("events", []):
                message = event["message"]

                # Extract the JSON part from the message
                json_part = message.split('\t')[-1].strip()
                try:
                    msg = json.loads(json_part)
                    if msg.get("object_name") == object_key:
                        size = abs(int(msg.get("size_delta", 0)))
                        logger.info(json.dumps({"matched_size": size}))
                        return size
                except json.JSONDecodeError:
                    logger.info(json.dumps({"error": "Could not parse JSON", "message": json_part}))
                    continue

            next_token = response.get("nextToken")
            if not next_token:
                break

    except ClientError as e:
        logger.info(json.dumps({"error": "Error searching logs", "details": str(e)}))

    return None

def lambda_handler(event, context):
    log_group = context.log_group_name

    try:
        for sqs_record in event["Records"]:
            body = sqs_record["body"]
            sns_message = json.loads(body) if isinstance(body, str) else body
            s3_event = json.loads(sns_message["Message"])

            for record in s3_event["Records"]:
                s3_info = record["s3"]
                object_key = s3_info["object"]["key"]
                event_name = record["eventName"]

                if event_name.startswith("ObjectCreated"):
                    size = int(s3_info["object"]["size"])
                    log_obj = {
                        "object_name": object_key,
                        "size_delta": size
                    }

                elif event_name.startswith("ObjectRemoved"):
                    size = get_object_size_from_logs(log_group, object_key)
                    if size is None:
                        logger.info(json.dumps({"warning": f"Size not found for deleted object: {object_key}"}))
                        continue
                    log_obj = {
                        "object_name": object_key,
                        "size_delta": -size
                    }

                else:
                    logger.info(json.dumps({"warning": f"Unhandled event type: {event_name}"}))
                    continue

              
                logger.info(json.dumps(log_obj))

        return {"statusCode": 200, "body": json.dumps("Logging successful!")}

    except Exception as e:
        logger.info(json.dumps({"error": "Logging failed", "details": str(e)}))
        return {"statusCode": 500, "body": json.dumps("Logging failed")}