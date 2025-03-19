import json
import boto3
import os
from datetime import datetime
from botocore.exceptions import ClientError

s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb', region_name='us-east-2')

# DynamoDB Table name
DYNAMODB_TABLE_NAME = os.environ['DYNAMODB_TABLE_NAME']
# Bucket name
BUCKET_NAME = os.environ['BUCKET_NAME']

def lambda_handler(event, context):
    try:
        # Process SQS event
        for record in event['Records']:
            # Parse the SNS message from the SQS event
            message = json.loads(record['body'])
            s3_event = json.loads(message['Message'])
            
            # Calculate the total size of all objects in the bucket
            total_size = 0
            total_objects = 0

            response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
            if 'Contents' in response:
                for obj in response['Contents']:
                    total_size += obj['Size']
                    total_objects += 1

            # Get the current timestamp
            timestamp = int(datetime.now().timestamp())

            # Get the DynamoDB table
            table = dynamodb.Table(DYNAMODB_TABLE_NAME)

            # Insert the record into the DynamoDB table
            table.put_item(
                Item={
                    'bucket_name': BUCKET_NAME,
                    'timestamp': timestamp,
                    'size': total_size,
                    'object_count': total_objects
                }
            )

        return {
            'statusCode': 200,
            'body': json.dumps('Bucket size data updated successfully.')
        }

    except ClientError as e:
        print(f"Error occurred: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps(f"Error: {e}")
        }
