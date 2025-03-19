import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface PlottingStackProps extends StackProps {
    bucket: s3.Bucket;
    table: dynamodb.Table;
}

export class PlottingStack extends Stack {
    public readonly plottingLambda: lambda.Function;

    constructor(scope: Construct, id: string, props: PlottingStackProps) {
        super(scope, id, props);

        const MATPLOTLIB_LAYER_ARN = 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-matplotlib:16';
        const NUMPY_LAYER_ARN = 'arn:aws:lambda:us-east-1:770693421928:layer:Klayers-p311-numpy:14'

        // Plotting Lambda
        this.plottingLambda = new lambda.Function(this, 'PlottingLambda', {
            runtime: lambda.Runtime.PYTHON_3_11,
            handler: 'plotting.lambda_handler',
            code: lambda.Code.fromAsset('lambda_functions/plotting'),
            timeout: cdk.Duration.seconds(50),
            memorySize: 512,
            environment: {
                BUCKET_NAME: props.bucket.bucketName,
                DYNAMODB_TABLE_NAME: props.table.tableName,
            },
        });

        this.plottingLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ["dynamodb:Query","dynamodb:Scan"],
            resources: [
                props.table.tableArn,
                `${props.table.tableArn}/index/BucketSizeIndex`
            ],
        }));

        this.plottingLambda.addToRolePolicy(new iam.PolicyStatement({
            actions: ["s3:PutObject"],
            resources: [`${props.bucket.bucketArn}/plot.png`],
        }));

        this.plottingLambda.addLayers(
            lambda.LayerVersion.fromLayerVersionArn(
                this, 
                'MatplotlibLayer', 
                MATPLOTLIB_LAYER_ARN,
            )
        );

        this.plottingLambda.addLayers(
            lambda.LayerVersion.fromLayerVersionArn(
                this,
                'NumpyLayer',
                NUMPY_LAYER_ARN,
            )
        );
    }
}
