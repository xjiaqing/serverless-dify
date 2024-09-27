import { Stack, StackProps } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { AuroraPostgresEngineVersion, ClusterInstance, DatabaseCluster, DatabaseClusterEngine } from "aws-cdk-lib/aws-rds";
import { Construct } from "constructs";

export class MetadataStorageStack extends Stack {

    public readonly cluster: DatabaseCluster;

    constructor(scope: Construct, id: string, props: MetadataStorageStackProps) {
        super(scope, id, props);

        // security group for dify metadata postgresql
        const sg = new SecurityGroup(this, "dify-rds-metadata", {
            vpc: props.vpc, allowAllOutbound: true
        });
        sg.addIngressRule(Peer.anyIpv4(), Port.tcp(5432))

        this.cluster = new DatabaseCluster(this, 'dify-metadata-storage', {
            vpc: props.vpc,
            securityGroups: [sg],
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },

            clusterIdentifier: 'dify-metadata-storage',
            instanceIdentifierBase: 'dify-metadata-storage-',
            engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_15_4 }),
            writer: ClusterInstance.serverlessV2('dify-metadata-storage'),
            cloudwatchLogsRetention: RetentionDays.ONE_WEEK,
            serverlessV2MinCapacity: 0.5,
            serverlessV2MaxCapacity: 2,
            iamAuthentication: true,
            defaultDatabaseName: 'dify',
        })
    }
}


export interface MetadataStorageStackProps extends StackProps {

    /**
     * vpc configure
     */
    readonly vpc: Vpc;
}