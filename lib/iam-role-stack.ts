import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";

export class IAMRoleStack extends cdk.Stack {
  public readonly sizeTrackingRole: iam.Role;
  public readonly plottingRole: iam.Role;
  public readonly driverRole: iam.Role;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketName = cdk.Fn.importValue("MyBucketName");
    const tableName = cdk.Fn.importValue("MyTableName");

    this.sizeTrackingRole = new iam.Role(this, "SizeTrackingLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: "SizeTrackingLambdaRole",
    });

    this.sizeTrackingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:ListBucket", "s3:GetObject"],
        resources: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`,
        ],
      }),
    );

    this.sizeTrackingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:UpdateItem"],
        resources: [
          `arn:aws:dynamodb:${this.region}:${this.account}:table/${tableName}`,
        ],
      }),
    );

    this.plottingRole = new iam.Role(this, "PlottingLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: "PlottingLambdaRole",
    });

    this.plottingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:ListBucket"],
        resources: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`,
        ],
      }),
    );

    this.plottingRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Query"],
        resources: [
          `arn:aws:dynamodb:${this.region}:${this.account}:table/${tableName}`,
        ],
      }),
    );

    this.driverRole = new iam.Role(this, "DriverLambdaRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      roleName: "DriverLambdaRole",
    });

    this.driverRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        resources: [
          `arn:aws:s3:::${bucketName}`,
          `arn:aws:s3:::${bucketName}/*`,
        ],
      }),
    );

    this.driverRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["execute-api:Invoke"],
        resources: ["*"],
      }),
    );
  }
}
