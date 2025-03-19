import json
import boto3
import time
import requests
import os

s3_client = boto3.client('s3')
BUCKET_NAME = os.environ['BUCKET_NAME']
PLOTTING_API_URL = os.environ['PLOTTING_API_URL']

def lambda_handler(event, context):
    try:
        # Create assignment1.txt
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key='assignment1.txt',
            Body='Empty Assignment 1.'
        )
        print("Created assignment1.txt")
        time.sleep(60)

        # Create assignment2.txt
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key='assignment2.txt',
            Body='Empty Assignment 2222222222'
        )
        print("Created assignment2.txt")
        time.sleep(60)  # Wait for alarm and cleanup

        # Create assignment3.txt
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key='assignment3.txt',
            Body='33'
        )
        print("Created assignment3.txt")
        time.sleep(120)  # Wait for alarm and cleanup

        # Call plotting API
        response = requests.get(PLOTTING_API_URL)
        if response.status_code == 200:
            print("Successfully generated plot")
        else:
            print(f"Error calling plotting API: {response.status_code}")

        return {
            'statusCode': 200,
            'body': 'Driver lambda completed successfully'
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Error in driver lambda: {str(e)}'
        }
