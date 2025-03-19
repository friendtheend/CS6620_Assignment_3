import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

interface LambdaStackProps extends StackProps {
    bucket: s3.Bucket;
    table: dynamodb.Table;
    sizeTrackingQueue: sqs.Queue;
    loggingQueue: sqs.Queue;
}

export class LambdaStack extends Stack {
    public readonly driverLambda: lambda.Function;
    public readonly sizeTrackingLambda: lambda.Function;
    public readonly loggingLambda: lambda.Function;
    public readonly loggingLambdaLogGroup: logs.LogGroup;

    constructor(scope: Construct, id: string, props: LambdaStackProps) {
        super(scope, id, props);

        // Create log group first
        this.loggingLambdaLogGroup = new logs.LogGroup(this, 'LoggingLambdaLogGroup', {
            retention: logs.RetentionDays.ONE_WEEK,
        });

        const REQUESTS_LAYER_ARN = 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-requests:15';

        // Size Tracking Lambda
        this.sizeTrackingLambda = new lambda.Function(this, 'SizeTrackingLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'size-tracking.lambda_handler',
            code: lambda.Code.fromAsset('lambda_functions/size_tracking'),
            environment: {
                BUCKET_NAME: props.bucket.bucketName,
                DYNAMODB_TABLE_NAME: props.table.tableName,
            },
        });

        // Add SQS queue as event source
        this.sizeTrackingLambda.addEventSource(new lambdaEventSources.SqsEventSource(props.sizeTrackingQueue));

        // Grant permissions
        props.bucket.grantRead(this.sizeTrackingLambda);
        props.table.grantWriteData(this.sizeTrackingLambda);

        // Logging Lambda
        this.loggingLambda = new lambda.Function(this, 'LoggingLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'custom_logging.lambda_handler',
            code: lambda.Code.fromAsset('lambda_functions/logging'),
            environment: {
                LOG_GROUP_NAME: this.loggingLambdaLogGroup.logGroupName,
                BUCKET_NAME: props.bucket.bucketName,
            },
        });

        // Add SQS queue as event source
        this.loggingLambda.addEventSource(new lambdaEventSources.SqsEventSource(props.loggingQueue));

        // Grant permissions to read CloudWatch logs
        this.loggingLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'logs:FilterLogEvents',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [this.loggingLambdaLogGroup.logGroupArn],
        }));

        // Grant permissions to read S3
        props.bucket.grantRead(this.loggingLambda);

        // Driver Lambda
        this.driverLambda = new lambda.Function(this, 'DriverLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'driver.lambda_handler',
            code: lambda.Code.fromAsset('lambda_functions/driver'),
            timeout: cdk.Duration.minutes(6),  // 5 minutes timeout
            environment: {
                BUCKET_NAME: props.bucket.bucketName,
            },
        });
        this.driverLambda.addLayers(lambda.LayerVersion.fromLayerVersionArn(this, 'RequestsLayer', REQUESTS_LAYER_ARN));

        // Grant permissions
        props.bucket.grantReadWrite(this.driverLambda);
    }
}
