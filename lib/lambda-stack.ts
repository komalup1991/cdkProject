import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as api from "aws-cdk-lib/aws-apigateway";
import { IAMRoleStack } from "./iam-role-stack";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import { Fn } from "aws-cdk-lib";

interface LambdaStackProps extends cdk.StackProps {
  roleStack: IAMRoleStack;
}

export class LambdaStack extends cdk.Stack {
  public readonly sizeTrackingLambda: lambda.Function;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const matplotlibLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "matplotlibLayer",
      "arn:aws:lambda:us-west-1:770693421928:layer:Klayers-p311-matplotlib:15",
    );

    const numpyLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "numpyLayer",
      "arn:aws:lambda:us-west-1:770693421928:layer:Klayers-p311-numpy:14",
    );

    const requestsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "requestsLayer",
      "arn:aws:lambda:us-west-1:770693421928:layer:Klayers-p311-requests:15",
    );

    const bucketName = cdk.Fn.importValue("MyBucketName");
    const tableName = cdk.Fn.importValue("MyTableName");

    const bucket = s3.Bucket.fromBucketAttributes(this, "ImportedBucket", {
      bucketArn: Fn.importValue("MyBucketArn"),
    });

    this.sizeTrackingLambda = new lambda.Function(this, "SizeTrackingLambda", {
      functionName: "size_tracking_lambda",
      handler: "size_tracking_lambda.lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_11,
      role: props.roleStack.sizeTrackingRole,
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(210),
      environment: {
        TABLE_NAME: tableName,
      },
    });

    this.addS3EventNotifications(bucket);

    new cdk.CfnOutput(this, "SizeTrackingLambdaARN", {
      value: this.sizeTrackingLambda.functionArn,
      description: "ARN of the Size Tracking Lambda",
    });

    const plottingLambda = new lambda.Function(this, "PlottingLambda", {
      functionName: "plotting_lambda",
      handler: "plotting_lambda.lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_11,
      role: props.roleStack.plottingRole,
      code: lambda.Code.fromAsset("lambda"),
      layers: [matplotlibLayer, numpyLayer],
      timeout: cdk.Duration.seconds(210),
      environment: {
        BUCKET_NAME: bucketName,
        TABLE_NAME: tableName,
        MPLCONFIGDIR: "/tmp",
      },
    });

    const plottingApiGateway = new api.RestApi(this, "PlottingApiGateway", {
      restApiName: "PlottingAPI",
    });

    const plottingResource = plottingApiGateway.root.addResource("plot");
    plottingResource.addMethod(
      "GET",
      new api.LambdaIntegration(plottingLambda),
    );

    const plottingApiUrl = plottingApiGateway.url;

    new cdk.CfnOutput(this, "PlottingApiUrl", {
      description: "Invoke URL for the Plotting API Gateway",
      value: plottingApiUrl,
    });

    new lambda.Function(this, "DriverLambda", {
      functionName: "driver_lambda",
      handler: "driver_lambda.lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_11,
      role: props.roleStack.driverRole,
      code: lambda.Code.fromAsset("lambda"),
      layers: [requestsLayer],
      timeout: cdk.Duration.seconds(210),
      environment: {
        BUCKET_NAME: bucketName,
        PLOTTING_API_URL: plottingApiUrl,
      },
    });
  }

  public addS3EventNotifications(bucket: s3.IBucket) {
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(this.sizeTrackingLambda),
    );
    bucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.LambdaDestination(this.sizeTrackingLambda),
    );
  }
}
