import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

interface ApiGatewayStackProps extends StackProps {
  plottingLambda: lambda.Function;
}

export class ApiGatewayStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ApiGatewayStackProps) {
    super(scope, id, props);

    // Define API Gateway
    const api = new apigateway.LambdaRestApi(this, 'PlottingApi', {
      handler: props.plottingLambda,
      proxy: false,
    });

    // Define a single endpoint and associate it with the plotting lambda
    const plottingEndpoint = api.root.addResource('plot');
    plottingEndpoint.addMethod('GET');

    // Export the API URL for use in driver Lambda
    this.apiUrl = api.urlForPath('/plot');
  }
}
