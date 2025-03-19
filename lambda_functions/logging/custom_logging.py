import json
import boto3
import os
from datetime import datetime

# Get the log group name from environment variable
LOG_GROUP_NAME = os.environ['LOG_GROUP_NAME']
BUCKET_NAME = os.environ['BUCKET_NAME']

# Initialize CloudWatch Logs and S3 clients
logs_client = boto3.client('logs')
s3_client = boto3.client('s3')

def create_log_stream_if_not_exists(log_group_name, log_stream_name):
    try:
        logs_client.create_log_stream(
            logGroupName=log_group_name,
            logStreamName=log_stream_name
        )
    except logs_client.exceptions.ResourceAlreadyExistsException:
        pass

def get_total_bucket_size():
    total_size = 0
    paginator = s3_client.get_paginator('list_objects_v2')
    
    for page in paginator.paginate(Bucket=BUCKET_NAME):
        if 'Contents' in page:
            for obj in page['Contents']:
                total_size += obj['Size']
    
    return total_size

def lambda_handler(event, context):
    try:
        # Create a log stream for this execution
        log_stream_name = f"s3-events-{datetime.now().strftime('%Y-%m-%d-%H-%M-%S')}"
        create_log_stream_if_not_exists(LOG_GROUP_NAME, log_stream_name)

        for record in event['Records']:
            # Parse SQS message
            message = json.loads(record['body'])
            s3_event = json.loads(message['Message'])
            
            for s3_record in s3_event['Records']:
                event_name = s3_record['eventName']
                object_name = s3_record['s3']['object']['key']
                print(f"Processing event: {event_name} for object: {object_name}")
                
                # Calculate size_delta
                if 'ObjectCreated' in event_name:
                    size_delta = s3_record['s3']['object']['size']
                else:
                    size_delta = 0
                
                # Get current total size directly from bucket
                total_size = get_total_bucket_size()
                print(f"Current total bucket size: {total_size}")


                # Log to CloudWatch Logs
                log_event = {
                    'object_name': object_name,
                    'size_delta': size_delta,
                    'total_size': total_size,
                    'event_type': 'ObjectCreated' if 'ObjectCreated' in event_name else 'ObjectRemoved',
                    'timestamp': int(datetime.now().timestamp() * 1000)
                }
                
                logs_client.put_log_events(
                    logGroupName=LOG_GROUP_NAME,
                    logStreamName=log_stream_name,
                    logEvents=[{
                        'timestamp': log_event['timestamp'],
                        'message': json.dumps(log_event)
                    }]
                )

        return {
            'statusCode': 200,
            'body': 'Successfully processed events'
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f'Error processing events: {str(e)}'
        } 