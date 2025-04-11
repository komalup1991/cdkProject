import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

import { Construct } from "constructs";

export class S3Stack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly plotBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const isProduction = process.env.NODE_ENV === "production";

    const uniqueBucketName = `test-bucket-${this.account}-${this.region}`;

    this.bucket = new s3.Bucket(this, "TestBucket", {
      bucketName: uniqueBucketName,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true, // Enables versioning
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    const plotBucketName = `plot-bucket-${this.account}-${this.region}`;

    this.plotBucket = new s3.Bucket(this, "PlotBucket", {
      bucketName: plotBucketName,
      removalPolicy: isProduction
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true, // Enables versioning
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    });

    new cdk.CfnOutput(this, "BucketName", {
      value: this.bucket.bucketName,
      exportName: "MyBucketName",
    });

    new cdk.CfnOutput(this, "BucketArnOutput", {
      value: this.bucket.bucketArn,
      exportName: "MyBucketArn",
    });

    new cdk.CfnOutput(this, "PlotBucketName", {
      value: this.plotBucket.bucketName,
      exportName: "PlotBucketName",
    });
  }
}
