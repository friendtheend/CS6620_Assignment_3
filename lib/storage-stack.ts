import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

export class StorageStack extends Stack {
  public readonly bucket: s3.Bucket;
  public readonly table: dynamodb.Table;
  public readonly topic: sns.Topic;
  public readonly sizeTrackingQueue: sqs.Queue;
  public readonly loggingQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create S3 bucket
    this.bucket = new s3.Bucket(this, 'TestBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create DynamoDB table
    this.table = new dynamodb.Table(this, 'S3ObjectSizeHistory', {
      partitionKey: { name: 'bucket_name', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // Add GSI for bucket size
    this.table.addGlobalSecondaryIndex({
      indexName: 'BucketSizeIndex',
      partitionKey: { name: 'bucket_name', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'size', type: dynamodb.AttributeType.NUMBER },
    });

    // Create SNS Topic
    this.topic = new sns.Topic(this, 'S3EventTopic');

    // Create SQS Queues
    this.sizeTrackingQueue = new sqs.Queue(this, 'SizeTrackingQueue');
    this.loggingQueue = new sqs.Queue(this, 'LoggingQueue');

    // Subscribe queues to topic
    this.topic.addSubscription(new subscriptions.SqsSubscription(this.sizeTrackingQueue));
    this.topic.addSubscription(new subscriptions.SqsSubscription(this.loggingQueue));

    // Add S3 notifications to SNS topic
    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(this.topic)
    );
    this.bucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.SnsDestination(this.topic)
    );
  }
}
