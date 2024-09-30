import { NestedStack, StackProps, aws_elasticache as elasticache } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

export class RedisStack extends NestedStack {

    private readonly port: number = 6379

    public readonly cluster: elasticache.CfnServerlessCache;

    constructor(scope: Construct, id: string, props: DifyRedisStackProps) {
        super(scope, id, props);

        const sg = new SecurityGroup(scope, "RedisSecurityGroup", { vpc: props.vpc, allowAllOutbound: true });
        sg.addIngressRule(Peer.ipv4(props.vpc.vpcCidrBlock), Port.tcp(this.port))

        //todo elasticache for redis user & password auth

        this.cluster = new elasticache.CfnServerlessCache(scope, 'RedisServerlessCache', {
            engine: 'redis',
            serverlessCacheName: 'dify-svl-redis',
            description: 'serverless redis cluster using for dify redis',
            securityGroupIds: [sg.securityGroupId],
            subnetIds: props.vpc.privateSubnets.map(subnet => subnet.subnetId)
        })
    }
}

export interface DifyRedisStackProps extends StackProps {

    readonly vpc: Vpc;

} 