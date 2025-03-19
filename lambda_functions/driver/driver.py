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
        # Step 1: Create object 'assignment1.txt' with initial content
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key='assignment1.txt',
            Body='Empty Assignment 1'
        )
        print("Created 'assignment1.txt' with content: 'Empty Assignment 1'")

        # Wait
        time.sleep(1.5)

        # Step 2: Update 'assignment1.txt' with new content
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key='assignment1.txt',
            Body='Empty Assignment 2222222222'
        )
        print("Updated 'assignment1.txt' with content: 'Empty Assignment 2222222222'")

        # Wait
        time.sleep(1.5)

        # Step 3: Delete 'assignment1.txt'
        s3_client.delete_object(
            Bucket=BUCKET_NAME,
            Key='assignment1.txt'
        )
        print("Deleted 'assignment1.txt'")

        # Wait
        time.sleep(1.5)

        # Step 4: Create object 'assignment2.txt' with content "33"
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key='assignment2.txt',
            Body='33'
        )
        print("Created 'assignment2.txt' with content: '33'")

        # Wait
        time.sleep(1.5)

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
