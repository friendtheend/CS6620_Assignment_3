import * as cdk from 'aws-cdk-lib';
import { StorageStack } from '../lib/storage-stack';
import { PlottingStack } from '../lib/plotting-stack';
import { ApiGatewayStack } from '../lib/api-gateway-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

// 1. Create Storage Stack
const storageStack = new StorageStack(app, 'StorageStack');

// 2. Create Lambda Stack
const lambdaStack = new LambdaStack(app, 'LambdaStack', {
  bucket: storageStack.bucket,
  table: storageStack.table,
  sizeTrackingQueue: storageStack.sizeTrackingQueue,
  loggingQueue: storageStack.loggingQueue,
});

// 3. Create Plotting Stack
const plottingStack = new PlottingStack(app, 'PlottingStack', {
  bucket: storageStack.bucket,
  table: storageStack.table,
});

// 4. Create API Gateway Stack
const apiGatewayStack = new ApiGatewayStack(app, 'ApiGatewayStack', {
  plottingLambda: plottingStack.plottingLambda,
});

// 5. Create Monitoring Stack
const monitoringStack = new MonitoringStack(app, 'MonitoringStack', {
  bucket: storageStack.bucket,
  loggingLogGroup: lambdaStack.loggingLambdaLogGroup,
});

// Update Driver Lambda environment
lambdaStack.driverLambda.addEnvironment('PLOTTING_API_URL', apiGatewayStack.apiUrl);
