import { NestedStack, RemovalPolicy, StackProps } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { AuroraPostgresEngineVersion, ClusterInstance, DatabaseCluster, DatabaseClusterEngine, SubnetGroup } from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export class MetadataStoreStack extends NestedStack {

    private readonly port: number = 5432

    public readonly cluster: DatabaseCluster;

    constructor(scope: Construct, id: string, props: MetadataStorageStackProps) {
        super(scope, id, props);

        // security group for dify metadata postgresql
        const sg = new SecurityGroup(scope, "MetadataStorageSecurityGroup", {
            vpc: props.vpc, allowAllOutbound: true
        });
        sg.addIngressRule(Peer.anyIpv4(), Port.tcp(this.port))

        // subnet group 
        const subnetGroup = new SubnetGroup(scope, 'MetadataStorageSubnetGroup', {
            description: 'DifyMetadataStorage',
            vpc: props.vpc,
            removalPolicy: RemovalPolicy.DESTROY,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        this.cluster = new DatabaseCluster(scope, 'MetadataStorageDatabaseCluster', {
            vpc: props.vpc,
            securityGroups: [sg],
            port: this.port,
            subnetGroup: subnetGroup,
            clusterIdentifier: 'MetadataStorage',
            engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_15_4 }),
            writer: ClusterInstance.serverlessV2('MetadataStorageServerlessWriteInstance'),
            cloudwatchLogsRetention: RetentionDays.ONE_WEEK,
            serverlessV2MinCapacity: 0.5,
            serverlessV2MaxCapacity: 2,
            iamAuthentication: true,
            enableDataApi: true,
            defaultDatabaseName: 'dify',
        })

        this.cluster.applyRemovalPolicy(RemovalPolicy.DESTROY)
    }
}


export interface MetadataStorageStackProps extends StackProps {

    /**
     * vpc configure
     */
    readonly vpc: Vpc;
}