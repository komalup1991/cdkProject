import json
import boto3
import datetime
import matplotlib.pyplot as plt
import os

s3_client = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

BUCKET_NAME = os.environ.get("BUCKET_NAME")
PLOT_BUCKET_NAME = os.environ.get("PLOT_BUCKET_NAME")
TABLE_NAME = os.environ.get("TABLE_NAME")
PLOT_FILENAME = "plot.png"

def json_serial(obj):
    """JSON serializer for objects not serializable by default"""
    if isinstance(obj, datetime.datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")

def fetch_recent_data():
    """Fetch bucket size history from DynamoDB within the last 30 seconds."""
    table = dynamodb.Table(TABLE_NAME)
    
    now = int(datetime.datetime.utcnow().timestamp())  
    thirty_seconds_ago = now - 30  # Last 30 seconds

    print(f"Querying for bucket_name='{BUCKET_NAME}' with timestamps BETWEEN {thirty_seconds_ago} AND {now}")

    response = table.query(
        KeyConditionExpression="#b = :b AND #ts BETWEEN :start AND :end",
        ExpressionAttributeNames={"#b": "bucket_name", "#ts": "timestamp"},
        ExpressionAttributeValues={":b": BUCKET_NAME, ":start": thirty_seconds_ago, ":end": now}
    )

    print(f"Query response: {response}")  
    
    return response.get("Items", [])

def create_plot(data):
    """Create and upload a plot of the bucket size change, including max size history."""
    if not data:
        print("No data available to plot.")
        return

    timestamps = [int(item["timestamp"]) for item in data]
    # print timestamps and sizes
    print("Timestamps:", timestamps)
    print("Sizes:", [int(item["total_size"]) for item in data])
    sizes = [int(item["total_size"]) for item in data]

    max_size_ever = max(sizes) if sizes else 0  

    plt.figure(figsize=(15, 10))
    plt.plot(timestamps, sizes, marker="o", linestyle="-", label="Bucket Size")

    # Add max size line
    plt.axhline(y=max_size_ever, color="r", linestyle="--", label=f"Max Size: {max_size_ever} bytes")

    plt.xlabel("Timestamp")
    plt.ylabel("Size (bytes)")
    plt.legend()
    plt.title("S3 Bucket Size Change Over Time")

    plt.xticks(rotation=45)
    plt.grid(True, linestyle="--", alpha=0.5)

    file_path = "/tmp/plot.png"
    plt.savefig(file_path)
    plt.close()

    try:
        s3_client.upload_file(file_path, PLOT_BUCKET_NAME, PLOT_FILENAME)
        print(f"Upload successful: {PLOT_FILENAME} uploaded to S3 bucket {PLOT_BUCKET_NAME}")
    except Exception as e:
        print(f"Upload failed: {e}")

def lambda_handler(event, context):
    """Fetch data, plot it, store in S3"""
    data = fetch_recent_data()
    
    if not data:
        print("No data fetched from DynamoDB")
        return {"statusCode": 200, "body": json.dumps("No data available.")}

    print(f"Fetched data: {data}")
    create_plot(data)
    
    response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
    print("S3 Objects:", json.dumps(response.get("Contents", []), indent=2, default=json_serial))

    return {"statusCode": 200, "body": json.dumps("Plot generated successfully!")}