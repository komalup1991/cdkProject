import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { MetricFilter, FilterPattern, LogGroup } from "aws-cdk-lib/aws-logs";
import {
  Metric,
  Alarm,
  ComparisonOperator,
  TreatMissingData,
} from "aws-cdk-lib/aws-cloudwatch";
import { LambdaAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { LambdaStack } from "./lambda-stack";
import { ILogGroup } from "aws-cdk-lib/aws-logs";
interface MonitoringStackProps extends cdk.StackProps {
  lambdaStack: LambdaStack;
  loggingLambdaLogGroup: ILogGroup;
}

export class CloudWatchAlarmStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const loggingLambdaLogGroup = props.lambdaStack.loggingLambdaLogGroup;

    new MetricFilter(this, "SizeDeltaMetricFilter", {
      logGroup: loggingLambdaLogGroup,
      metricNamespace: "Assignment4App",
      metricName: "TotalObjectSize",
      filterPattern: FilterPattern.exists("$.size_delta"),
      metricValue: "$.size_delta",
      defaultValue: 0,
    });

    const sizeDeltaMetric = new Metric({
      namespace: "Assignment4App",
      metricName: "TotalObjectSize",
      statistic: "Sum",
      period: cdk.Duration.minutes(5),
    });

    const cleanerLambdaArn = cdk.Fn.importValue("CleanerLambdaArn");
    const cleanerLambda = lambda.Function.fromFunctionArn(
      this,
      "ImportedCleanerLambda",
      cleanerLambdaArn,
    );

    const sizeDeltaAlarm = new Alarm(this, "SizeDeltaAlarm", {
      metric: sizeDeltaMetric,
      threshold: 20,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
    new lambda.CfnPermission(this, "CleanerLambdaInvokePermission", {
      action: "lambda:InvokeFunction",
      functionName: "cleaner_lambda",
      principal: "lambda.alarms.cloudwatch.amazonaws.com",
      sourceArn: sizeDeltaAlarm.alarmArn,
    });
    sizeDeltaAlarm.addAlarmAction(new LambdaAction(cleanerLambda));
  }
}
