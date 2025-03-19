import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

interface MonitoringStackProps extends StackProps {
  bucket: s3.Bucket;
  loggingLogGroup: logs.LogGroup;
}

export class MonitoringStack extends Stack {
  public readonly cleanerLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Create metric filter using the passed log group
    const metricFilter = new logs.MetricFilter(this, 'SizeDeltaMetricFilter', {
      logGroup: props.loggingLogGroup,
      filterPattern: logs.FilterPattern.literal('{ $.total_size = * }'),
      metricNamespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      metricValue: '$.total_size',
    });

    // Create alarm
    const metric = new cloudwatch.Metric({
      namespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      statistic: 'Maximum', // any value is OK, since period is 30 seconds, we make sure there is only one log event in 30 seconds
      period: cdk.Duration.seconds(10),
    });

    // Create Cleaner Lambda
    this.cleanerLambda = new lambda.Function(this, 'CleanerLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'cleaner.lambda_handler',
      code: lambda.Code.fromAsset('lambda_functions/cleaner'),
      timeout: cdk.Duration.minutes(1),
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
      },
    });

    // Grant permissions to Cleaner Lambda
    props.bucket.grantReadWrite(this.cleanerLambda);

    // Create alarm
    const alarm = new cloudwatch.Alarm(this, 'TotalSizeAlarm', {
      metric,
      threshold: 20,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // Add Cleaner Lambda as alarm action
    alarm.addAlarmAction(
      new actions.LambdaAction(this.cleanerLambda)
    );
  }
} 