import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class DynamoDBStack extends cdk.Stack {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.table = new dynamodb.Table(this, "S3ObjectSizeHistory", {
      tableName: "S3ObjectSizeHistory",
      partitionKey: {
        name: "bucket_name",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "timestamp",
        type: dynamodb.AttributeType.NUMBER,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 15,
      writeCapacity: 15,
    });

    new cdk.CfnOutput(this, "TableNameOutput", {
      value: this.table.tableName,
      exportName: "MyTableName",
    });
  }
}
