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
  sizeTrackingLambda: lambda.Function; // ✅ 传入 Lambda 对象
}

export class MonitoringStack extends Stack {
  public readonly cleanerLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // ✅ 自动获取 SizeTrackingLambda 的 log group
    const sizeTrackingLogGroup = logs.LogGroup.fromLogGroupName(
        this,
        'SizeTrackingLogGroup',
        `/aws/lambda/${props.sizeTrackingLambda.functionName}`
    );

    // ✅ MetricFilter 从日志中提取 total_size
    const metricFilter = new logs.MetricFilter(this, 'SizeDeltaMetricFilter', {
      logGroup: sizeTrackingLogGroup,
      filterPattern: logs.FilterPattern.literal('{ $.total_size = * }'),
      metricNamespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      metricValue: '$.total_size',
    });

    // ✅ 创建指标引用（CloudWatch Alarm 使用）
    const metric = new cloudwatch.Metric({
      namespace: 'Assignment4App',
      metricName: 'TotalObjectSize',
      statistic: 'Maximum',
      period: cdk.Duration.seconds(10),
    });

    // ✅ 创建 Cleaner Lambda
    this.cleanerLambda = new lambda.Function(this, 'CleanerLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'cleaner.lambda_handler',
      code: lambda.Code.fromAsset('lambda_functions/cleaner'),
      timeout: cdk.Duration.minutes(1),
      environment: {
        BUCKET_NAME: props.bucket.bucketName,
      },
    });

    // ✅ 给 Cleaner 权限读写 bucket
    props.bucket.grantReadWrite(this.cleanerLambda);

    // ✅ 创建 Alarm，当 bucket 总大小 > 20 bytes 就触发 Cleaner
    const alarm = new cloudwatch.Alarm(this, 'TotalSizeAlarm', {
      metric,
      threshold: 20,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    // ✅ 当警报触发时调用 Cleaner
    alarm.addAlarmAction(new actions.LambdaAction(this.cleanerLambda));
  }
}
