import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import * as s3Notifications from "aws-cdk-lib/aws-s3-notifications";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Fn } from "aws-cdk-lib";

export class EventStack extends cdk.Stack {
  public readonly topic: sns.Topic;
  public readonly sizeTrackingQueue: sqs.Queue;
  public readonly loggingQueue: sqs.Queue;

  constructor(
    scope: Construct,
    id: string,
    props: { bucket: s3.Bucket } & cdk.StackProps,
  ) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketAttributes(this, "ImportedBucket", {
      bucketArn: Fn.importValue("MyBucketArn"),
    });
    this.topic = new sns.Topic(this, "S3EventTopic");

    this.sizeTrackingQueue = new sqs.Queue(this, "SizeTrackingQueue", {
      visibilityTimeout: cdk.Duration.seconds(240), // Set visibility timeout greater than Lambda timeout
    });
    this.loggingQueue = new sqs.Queue(this, "LoggingQueue", {
      visibilityTimeout: cdk.Duration.seconds(240), // Set visibility timeout greater than Lambda timeout
    });

    this.topic.addSubscription(
      new snsSubscriptions.SqsSubscription(this.sizeTrackingQueue),
    );
    this.topic.addSubscription(
      new snsSubscriptions.SqsSubscription(this.loggingQueue),
    );

    this.addS3EventNotifications(bucket);
  }

  public addS3EventNotifications(bucket: s3.IBucket) {
    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notifications.SnsDestination(this.topic),
    );
    bucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3Notifications.SnsDestination(this.topic),
    );
  }
}
