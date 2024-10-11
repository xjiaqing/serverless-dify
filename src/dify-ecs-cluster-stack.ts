import { NestedStack, StackProps } from "aws-cdk-lib";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { InstanceType, Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { AmiHardwareType, AsgCapacityProvider, Cluster, Ec2Service, EcsOptimizedImage, PlacementStrategy, TaskDefinition } from "aws-cdk-lib/aws-ecs";
import { Construct } from "constructs";
import { DifySandboxTaskDefinitionStack } from "./task-definitions/dify-sandbox";


export class DifyEcsClusterStack extends NestedStack {

    private readonly cluster: Cluster

    private readonly clusterDefaultCapacityProviderName = "serverless-dify-ecs-cluster-default-capacity-provider"

    private readonly sandboxTaskDefinition: TaskDefinition

    private readonly securityGroup: SecurityGroup

    constructor(scope: Construct, id: string, props: EcsClusterStackProps) {
        super(scope, id, props);

        this.cluster = new Cluster(this, 'EcsClusterStack', { vpc: props.vpc })
        this.cluster.addDefaultCloudMapNamespace({ name: 'serverless-dify-sandbox' })

        const capacityProviderSg = new SecurityGroup(this, 'capacityProviderSg', { vpc: props.vpc, allowAllOutbound: true })
        capacityProviderSg.addIngressRule(Peer.anyIpv4(), Port.allTraffic())
        const capacityProvider = new AsgCapacityProvider(this, "EcsDefaultCapacityProvider", {
            capacityProviderName: this.clusterDefaultCapacityProviderName,
            autoScalingGroup: new AutoScalingGroup(this, 'defaultCapacityProviderAsg', {
                vpc: props.vpc,
                vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
                securityGroup: capacityProviderSg,
                instanceType: new InstanceType('m6i.xlarge'),
                machineImage: EcsOptimizedImage.amazonLinux2(AmiHardwareType.STANDARD),
                desiredCapacity: 1,
            }),
        })
        this.cluster.addAsgCapacityProvider(capacityProvider)
        // this.cluster.addDefaultCapacityProviderStrategy([{ capacityProvider: this.clusterDefaultCapacityProviderName }])


        this.securityGroup = new SecurityGroup(this, 'ServerlessDifyEcsTaskSG', { vpc: props.vpc, allowAllOutbound: true })
        this.securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic())

        this.sandboxTaskDefinition = new DifySandboxTaskDefinitionStack(this, 'DifySandboxTaskDefinitionStack', {}).definition
        this.sandboxTaskDefinition.node.addDependency(this.cluster)
        this.sandboxTaskDefinition.node.addDependency(this.securityGroup)

        this.runSandboxService()
    }

    runSandboxService() {
        const service = new Ec2Service(this, 'DifyEcsClusterSandboxService', {
            cluster: this.cluster,
            taskDefinition: this.sandboxTaskDefinition,
            desiredCount: 1,
            serviceName: 'serverless-dify-sandbox',
            vpcSubnets: this.cluster.vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }),
            securityGroups: [this.securityGroup],
            capacityProviderStrategies: [{ capacityProvider: this.clusterDefaultCapacityProviderName, weight: 1 }]
        })

        // service.enableServiceConnect({
        //     namespace: this.cluster.defaultCloudMapNamespace?.namespaceArn,
        //     services: [{
        //         portMappingName: this.sandboxTaskDefinition.defaultContainer?.portMappings[0].name || "serverless-dify-sandbox-8194-tcp",
        //         dnsName: "serverles-dify-sandbox",
        //         discoveryName: "serverless-dify-sandbox",
        //     }]
        // })

        service.addPlacementStrategies(
            PlacementStrategy.spreadAcross('attribute:ecs.availability-zone'),
            PlacementStrategy.spreadAcrossInstances(),
        )

        // service.node.addDependency(this.cluster, this.sandboxTaskDefinition)
    }
}

export interface EcsClusterStackProps extends StackProps {

    readonly vpc: Vpc;

}