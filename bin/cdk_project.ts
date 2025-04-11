#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { S3Stack } from "../lib/s3-stack";
import { DynamoDBStack } from "../lib/dynamodb-stack";
import { LambdaStack } from "../lib/lambda-stack";
import { IAMRoleStack } from "../lib/iam-role-stack";
import { EventStack } from "../lib/event-stack";
import { CloudWatchAlarmStack } from "../lib/monitoring-stack";

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const s3Stack = new S3Stack(app, "S3Stack", { env });
const dynamoDBStack = new DynamoDBStack(app, "DynamoDBStack", { env });
const iamRolesStack = new IAMRoleStack(app, "IAMRolesStack", { env });

const eventStack = new EventStack(app, "EventStack", {
  env,
  bucket: s3Stack.bucket,
});
const lambdaStack = new LambdaStack(app, "LambdaStack", {
  env,
  roleStack: iamRolesStack,
  eventStack,
});

new CloudWatchAlarmStack(app, "MonitoringStack", {
  env,
  lambdaStack,
  loggingLambdaLogGroup: lambdaStack.loggingLambdaLogGroup,
});

console.log(`Deploying to AWS Account: ${env.account}, Region: ${env.region}`);
