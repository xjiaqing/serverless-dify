import { Stack, StackProps, aws_elasticache as elasticache } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";


export class CeleryBrokerStack extends Stack {

    public readonly cluster: elasticache.CfnServerlessCache

    constructor(scope: Construct, id: string, props: CeleryBrokerStackProps) {
        super(scope, id, props);

        const sg = new SecurityGroup(this, 'celery-broker-sg', { vpc: props.vpc, allowAllOutbound: true })
        sg.addIngressRule(Peer.ipv4(props.vpc.vpcCidrBlock), Port.tcp(6379))

        // todo auth

        this.cluster = new elasticache.CfnServerlessCache(this, 'dify-celery-broker', {
            engine: 'redis',
            serverlessCacheName: 'serverless-dify-celery-broker',
            description: 'serverless redis cluster using for dify celery broker',
            securityGroupIds: [sg.securityGroupId],
            subnetIds: props.vpc.privateSubnets.map(subnet => subnet.subnetId)
        })

    }
}


export interface CeleryBrokerStackProps extends StackProps {
    readonly vpc: Vpc;
}