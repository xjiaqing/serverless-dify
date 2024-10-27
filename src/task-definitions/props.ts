import { StackProps } from "aws-cdk-lib";
import { Vpc } from "aws-cdk-lib/aws-ec2";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";

export interface DifyTaskDefinitionStackProps extends StackProps {

    network: Vpc;

    celeryBroker: { hostname: string, port: string }

    redis: { hostname: string, port: string }

    metadataStore: {
        hostname: string,
        port: number,
        secret: Secret,
        defaultDatabase: string
    };

    vectorStore: {
        hostname: string,
        port: number,
        secret: Secret,
        defaultDatabase: string
    };

    fileStore: Bucket;

    apiSecretKey: Secret;

    sandboxCodeExecutionKey: Secret;

}