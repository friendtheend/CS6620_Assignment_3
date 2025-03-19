import json
import boto3
import os
import io
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
from decimal import Decimal

# Initialize DynamoDB and S3 clients
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
s3_client = boto3.client('s3', region_name='us-east-1')

# Environment variables for Lambda
BUCKET_NAME = os.environ['BUCKET_NAME']
DYNAMODB_TABLE_NAME = os.environ['DYNAMODB_TABLE_NAME']

def lambda_handler(event, context):
    try:
        # Get the current timestamp and calculate  seconds earlier
        current_timestamp = int(datetime.now().timestamp() * 1000)
        start_timestamp = current_timestamp - (10 * 1000)  # 10 秒前

        print(f"Current timestamp (ms): {current_timestamp}")
        print(f"Start timestamp (ms): {start_timestamp}")

        # Query DynamoDB for entries in the last 10 seconds
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('bucket_name').eq(BUCKET_NAME) &
                                   boto3.dynamodb.conditions.Key('timestamp').between(start_timestamp, current_timestamp)
        )

        items = response.get('Items', [])
        print(f"Queried {len(items)} items from DynamoDB.")
        print(f"Items: {items}")

        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps('No data available in the last 10 seconds.')
            }

        # Extract data for plotting
        timestamps = [int(float(item['timestamp'])) for item in items]
        sizes = [float(item['size']) for item in items]

        # Calculate relative times (e.g., 0, -1, -2, etc.)
        relative_times = [-(current_timestamp - ts) / 1000 for ts in timestamps]
        print("Timestamps:", timestamps)
        print("Relative times:", relative_times)
        print("Sizes:", sizes)

        # Query for the maximum historical size
        response_max = table.query(
            IndexName='BucketSizeIndex',
            KeyConditionExpression=boto3.dynamodb.conditions.Key('bucket_name').eq(BUCKET_NAME),
            ScanIndexForward=False,
            Limit=1
        )

        max_size = float(response_max['Items'][0]['size']) if response_max.get('Items') else 0

        # Create the plot
        plt.figure(figsize=(10, 6))
        plt.plot(relative_times, sizes, label='Bucket Size (Last 10 seconds)', color='b')
        plt.axhline(y=max_size, color='r', linestyle='--', label='Historical High')
        plt.xlim(-10, 0)
        plt.xlabel('Relative Time (seconds)')
        plt.ylabel('Size (Bytes)')
        plt.title('S3 Bucket Size Change in Last 10 Seconds')
        plt.xticks(rotation=45)
        plt.legend(loc='upper left', bbox_to_anchor=(1, 1))
        plt.tight_layout()

        # Save plot to a buffer
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)

        # Upload plot to S3
        s3_key = 'plot.png'
        s3_client.put_object(Bucket=BUCKET_NAME, Key=s3_key, Body=buffer, ContentType='image/png')

        return {
            'statusCode': 200,
            'body': json.dumps(f'Plot successfully generated and stored in s3://{BUCKET_NAME}/{s3_key}')
        }

    except ClientError as e:
        print(f"Error occurred: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f"Error: {e}")
        }
