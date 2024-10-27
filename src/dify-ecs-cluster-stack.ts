import { aws_elasticache, NestedStack, StackProps } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, FargateService } from "aws-cdk-lib/aws-ecs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { MetadataStoreStack } from "./metadata-store";
import { DifyApiTaskDefinitionStack } from "./task-definitions/dify-api";
import { DifyTaskDefinitionStackProps } from "./task-definitions/props";
import { VectorStoreStack } from "./vector-store";


export class DifyEcsClusterStack extends NestedStack {

    private readonly cluster: Cluster

    private readonly apiSecretKey = new Secret(this, 'ServerlessDifyApiSecretKey', {
        generateSecretString: { passwordLength: 32 }
    })

    private readonly sandboxCodeExecutionKey = new Secret(this, 'ServerlessDifySandboxCodeExecutionKey', {
        generateSecretString: { passwordLength: 32 }
    })

    private readonly securityGroup: SecurityGroup

    constructor(scope: Construct, id: string, props: DifyEcsClusterStackProps) {
        super(scope, id, props);

        this.cluster = new Cluster(this, 'EcsClusterStack', { vpc: props.vpc, enableFargateCapacityProviders: true })
        this.securityGroup = new SecurityGroup(this, 'ServerlessDifyEcsTaskSG', { vpc: props.vpc, allowAllOutbound: true })
        this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic())

        const difyTaskDefinitionStackProps: DifyTaskDefinitionStackProps = {
            network: props.vpc,
            celeryBroker: {
                hostname: props.celeryBroker.attrEndpointAddress,
                port: props.celeryBroker.attrEndpointPort
            },

            redis: {
                hostname: props.redis.attrEndpointAddress,
                port: props.redis.attrEndpointPort,
            },

            metadataStore: {
                hostname: props.metadataStore.cluster.clusterEndpoint.hostname,
                port: props.metadataStore.cluster.clusterEndpoint.port,
                defaultDatabase: MetadataStoreStack.DEFAULT_DATABASE,
                secret: props.metadataStore.secret,
            },

            vectorStore: {
                hostname: props.vectorStore.cluster.clusterEndpoint.hostname,
                port: props.vectorStore.cluster.clusterEndpoint.port,
                defaultDatabase: VectorStoreStack.DEFAULT_DATABASE,
                secret: props.vectorStore.secret,
            },

            fileStore: props.storage,

            apiSecretKey: this.apiSecretKey,
            sandboxCodeExecutionKey: this.sandboxCodeExecutionKey,
        }

        this.runApiService(difyTaskDefinitionStackProps)
    }

    runApiService(props: DifyTaskDefinitionStackProps) {
        const taskDefinition = new DifyApiTaskDefinitionStack(this, 'DifyApiTaskDefinitionStack', props)
        taskDefinition.node.addDependency(this.cluster)
        taskDefinition.node.addDependency(this.securityGroup)

        const service = new FargateService(this, 'ServerlessDifyApiService', {
            cluster: this.cluster,
            taskDefinition: taskDefinition.definition,
            desiredCount: 1,
            serviceName: 'serverless-dify-api',
            vpcSubnets: this.cluster.vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }),
            securityGroups: [this.securityGroup],
        })

        return service
    }
}

export interface DifyEcsClusterStackProps extends StackProps {

    readonly vpc: Vpc;

    readonly celeryBroker: aws_elasticache.CfnServerlessCache;

    readonly redis: aws_elasticache.CfnServerlessCache;

    readonly metadataStore: MetadataStoreStack;

    readonly vectorStore: VectorStoreStack;

    readonly storage: Bucket

}