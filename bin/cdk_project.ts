#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { S3Stack } from "../lib/s3-stack";
import { DynamoDBStack } from "../lib/dynamodb-stack";
import { LambdaStack } from "../lib/lambda-stack";
import { IAMRoleStack } from "../lib/iam-role-stack";

const app = new cdk.App();

// Define AWS environment
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || "354918399170",
  region: process.env.CDK_DEFAULT_REGION || "us-west-1",
};

// Create independent stacks
new S3Stack(app, "S3Stack", { env });
new DynamoDBStack(app, "DynamoDBStack", { env });
const iamRolesStack = new IAMRoleStack(app, "IAMRolesStack", { env });
new LambdaStack(app, "LambdaStack", {
  env,
  roleStack: iamRolesStack,
});
console.log(`Deploying to AWS Account: ${env.account}, Region: ${env.region}`);
