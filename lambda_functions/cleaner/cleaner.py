import json
import boto3
import os
import time

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']

def lambda_handler(event, context):
    try:
        # Log the raw event for debugging
        
        # Extract alarm data directly from the event
        alarm_data = event['alarmData']
        print(f"Received Event: {json.dumps(alarm_data, indent=2)}")


        # List all objects in the S3 bucket
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME)
        
        if 'Contents' not in response:
            print("No objects to clean.")
            return {
                'statusCode': 200,
                'body': 'No objects to clean.'
            }

        # Find the largest object in the bucket
        largest_object = max(response['Contents'], key=lambda x: x['Size'])
        print(f"Largest object: {largest_object['Key']} (size: {largest_object['Size']} bytes)")

        # Delete the largest object
        time.sleep(10)
        s3_client.delete_object(
            Bucket=BUCKET_NAME,
            Key=largest_object['Key']
        )
        print(f"Successfully deleted {largest_object['Key']}")

        return {
            'statusCode': 200,
            'body': f"Successfully deleted {largest_object['Key']}"
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f"Error cleaning bucket: {str(e)}"
        }
