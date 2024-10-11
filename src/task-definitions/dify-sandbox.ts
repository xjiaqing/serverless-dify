import { NestedStack, RemovalPolicy, StackProps } from "aws-cdk-lib";
import { AppProtocol, AwsLogDriverMode, Compatibility, ContainerImage, CpuArchitecture, LogDriver, NetworkMode, OperatingSystemFamily, Protocol, TaskDefinition } from "aws-cdk-lib/aws-ecs";
import { Role } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";


export class DifySandboxTaskDefinitionStack extends NestedStack {

    public readonly definition: TaskDefinition

    private readonly logGroup: LogGroup

    constructor(scope: Construct, id: string, props: DifySandboxTaskDefinitionStackProps) {
        super(scope, id, props);

        this.logGroup = new LogGroup(this, 'DifySandboxLogGroup', {
            retention: RetentionDays.ONE_WEEK, removalPolicy: RemovalPolicy.DESTROY,
            logGroupName: '/ecs/serverless-dify/sandbox'
        })

        this.definition = new TaskDefinition(this, 'DifySandboxTaskDefinitionStack', {
            family: "serverless-dify-sandbox",
            taskRole: Role.fromRoleArn(this, "ServerlessDifyClusterSandboxTaskRole", "arn:aws:iam::867533378352:role/ECSTaskGeneralRole"),
            executionRole: Role.fromRoleArn(this, "ServerlessDifyClusterSandboxExecutionRole", "arn:aws:iam::867533378352:role/ECSTaskGeneralRole"),
            compatibility: Compatibility.EC2_AND_FARGATE,
            networkMode: NetworkMode.AWS_VPC,
            runtimePlatform: {
                operatingSystemFamily: OperatingSystemFamily.LINUX,
                cpuArchitecture: CpuArchitecture.X86_64
            },
            cpu: '1024',
            memoryMiB: '2048'
        })

        this.definition.node.addDependency(this.logGroup)
        this.definition.addContainer('sandbox', {
            containerName: "sandbox",
            essential: true,
            image: ContainerImage.fromRegistry("langgenius/dify-sandbox:0.2.9"),
            portMappings: [
                { containerPort: 8194, hostPort: 8194, name: "serverless-dify-sandbox-8194-tcp", appProtocol: AppProtocol.http, protocol: Protocol.TCP }
            ],
            cpu: 512,
            logging: LogDriver.awsLogs({ streamPrefix: 'sandbox', logGroup: this.logGroup, mode: AwsLogDriverMode.NON_BLOCKING }),
            environment: {
                'GIN_MODE': 'release',
                'WORKER_TIMEOUT': '15',
                'API_KEY': 'dify-sandbox',
            }
        })
    }

}

export interface DifySandboxTaskDefinitionStackProps extends StackProps {


}