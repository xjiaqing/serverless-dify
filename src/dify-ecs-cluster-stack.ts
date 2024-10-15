import { NestedStack, StackProps } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Cluster, FargateService, TaskDefinition } from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";
import { DifySandboxTaskDefinitionStack } from "./task-definitions/dify-sandbox";


export class DifyEcsClusterStack extends NestedStack {

    private readonly cluster: Cluster

    private readonly clusterDefaultCloudMapNamespaceName = "serverless-dify-cloudmap-namespace"

    private readonly sandboxTaskDefinition: TaskDefinition

    private readonly securityGroup: SecurityGroup

    constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id, props);

        this.cluster = new Cluster(this, 'EcsClusterStack', { vpc: props.vpc, enableFargateCapacityProviders: true })
        this.cluster.addDefaultCloudMapNamespace({
            vpc: props.vpc,
            name: this.clusterDefaultCloudMapNamespaceName,
            useForServiceConnect: true
        })

        this.securityGroup = new SecurityGroup(this, 'ServerlessDifyEcsTaskSG', { vpc: props.vpc, allowAllOutbound: true })
        this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic())

        this.sandboxTaskDefinition = new DifySandboxTaskDefinitionStack(this, 'DifySandboxTaskDefinitionStack', {}).definition
        this.sandboxTaskDefinition.node.addDependency(this.cluster)
        this.sandboxTaskDefinition.node.addDependency(this.securityGroup)

        this.runSandboxService()
    }

    runSandboxService() {

        const service = new FargateService(this, 'DifyEcsClusterSandboxService', {
            cluster: this.cluster,
            taskDefinition: this.sandboxTaskDefinition,
            desiredCount: 1,
            serviceName: 'serverless-dify-sandbox',
            vpcSubnets: this.cluster.vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }),
            securityGroups: [this.securityGroup],
        })

        service.enableServiceConnect({
            namespace: this.clusterDefaultCloudMapNamespaceName,
            services: [{
                portMappingName: this.sandboxTaskDefinition.defaultContainer?.portMappings[0].name || "serverless-dify-sandbox-8194-tcp",
                dnsName: "serverles-dify-sandbox",
                discoveryName: "serverless-dify-sandbox",
            }]
        })
    }
}

export interface EcsClusterStackProps extends StackProps {

    readonly vpc: Vpc;

}