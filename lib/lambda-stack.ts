import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as api from "aws-cdk-lib/aws-apigateway";
import { IAMRoleStack } from "./iam-role-stack";
import { Fn } from "aws-cdk-lib";
import { EventStack } from "./event-stack";
import * as logs from "aws-cdk-lib/aws-logs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
interface LambdaStackProps extends cdk.StackProps {
  roleStack: IAMRoleStack;
  eventStack: EventStack;
}

export class LambdaStack extends cdk.Stack {
  public readonly sizeTrackingLambda: lambda.Function;
  public readonly cleanerLambda: lambda.Function;
  public readonly loggingLambdaLogGroup: logs.ILogGroup;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const bucketName = cdk.Fn.importValue("MyBucketName");
    const tableName = cdk.Fn.importValue("MyTableName");
    const plotBucketName = cdk.Fn.importValue("PlotBucketName");
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
        QUEUE_URL: props.eventStack.sizeTrackingQueue.queueUrl,
      },
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
        PLOT_BUCKET_NAME: plotBucketName,
      },
    });

    const plottingApiGateway = new api.RestApi(this, "PlottingApiGateway", {
      restApiName: "PlottingAPI",
    });

    plottingApiGateway.root
      .addResource("plot")
      .addMethod("GET", new api.LambdaIntegration(plottingLambda));

    const plottingApiUrl = plottingApiGateway.url;
    new cdk.CfnOutput(this, "PlottingApiUrl", {
      description: "Invoke URL for the Plotting API Gateway",
      value: plottingApiUrl,
    });

    this.cleanerLambda = new lambda.Function(this, "CleanerLambda", {
      runtime: lambda.Runtime.PYTHON_3_11,
      functionName: "cleaner_lambda",
      handler: "cleaner_lambda.lambda_handler",
      role: props.roleStack.cleanerRole,
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(210),
      environment: {
        BUCKET_NAME: bucketName,
      },
    });
    new cdk.CfnOutput(this, "CleanerLambdaArn", {
      value: this.cleanerLambda.functionArn,
      exportName: "CleanerLambdaArn",
    });

    new lambda.Function(this, "DriverLambda", {
      functionName: "driver_lambda",
      handler: "driver_lambda.lambda_handler",
      runtime: lambda.Runtime.PYTHON_3_11,
      role: props.roleStack.driverRole,
      layers: [requestsLayer],
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(210),
      environment: {
        BUCKET_NAME: bucketName,
        PLOTTING_API_URL: plottingApiUrl,
      },
    });

    const loggingLambda = new lambda.Function(this, "LoggingLambda", {
      runtime: lambda.Runtime.PYTHON_3_11,
      functionName: "logging_lambda",
      handler: "logging_lambda.lambda_handler",
      role: props.roleStack.loggingRole,
      code: lambda.Code.fromAsset("lambda"),
      timeout: cdk.Duration.seconds(210),
      logRetention: logs.RetentionDays.ONE_MONTH,
      environment: {
        LOG_GROUP_NAME: "/aws/lambda/logging_lambda",
      },
    });
    this.loggingLambdaLogGroup = loggingLambda.logGroup;
    props.eventStack.sizeTrackingQueue.grantConsumeMessages(
      this.sizeTrackingLambda,
    );
    props.eventStack.loggingQueue.grantConsumeMessages(loggingLambda);
    this.sizeTrackingLambda.addEventSource(
      new SqsEventSource(props.eventStack.sizeTrackingQueue),
    );
    loggingLambda.addEventSource(
      new SqsEventSource(props.eventStack.loggingQueue),
    );
  }
}
