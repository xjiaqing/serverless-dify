import { RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { AuroraPostgresEngineVersion, ClusterInstance, DatabaseCluster, DatabaseClusterEngine, SubnetGroup } from "aws-cdk-lib/aws-rds";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";



export class VectorStoreStack extends Stack {

    private readonly port: number = 5432

    private readonly defaultDatabaseName: string = 'dify'

    public readonly cluster: DatabaseCluster

    constructor(scope: Construct, id: string, props: VectorStoreStackProps) {
        super(scope, id, props)

        const sg = new SecurityGroup(this, "DifyVectorStoreSecurityGroup", { vpc: props.vpc, allowAllOutbound: true })
        sg.addIngressRule(Peer.anyIpv4(), Port.tcp(this.port))

        const subnetGroup = new SubnetGroup(this, 'DifyVectorStoreSubnetGroup', {
            description: 'DifyVectorStore',
            vpc: props.vpc,
            removalPolicy: RemovalPolicy.DESTROY,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });


        this.cluster = new DatabaseCluster(this, 'DifyVectorStoreInstanceCluster', {
            vpc: props.vpc,
            securityGroups: [sg],
            port: this.port,
            subnetGroup: subnetGroup,
            clusterIdentifier: 'DifyVectorStore',
            engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_15_4 }),
            writer: ClusterInstance.serverlessV2('DifyVectorStore'),
            cloudwatchLogsRetention: RetentionDays.ONE_WEEK,
            serverlessV2MinCapacity: 0.5,
            serverlessV2MaxCapacity: 2,
            iamAuthentication: true,
            enableDataApi: true,
            defaultDatabaseName: this.defaultDatabaseName
        })

        this.enablePgvector()
    }

    private enablePgvector() {
        const cluster = this.cluster
        const query = new AwsCustomResource(this, 'Query-EnablePgVector', {
            onCreate: {
                service: 'RDSDataService',
                action: 'executeStatement',
                parameters: {
                    resourceArn: cluster.clusterArn,
                    secretArn: cluster.secret?.secretArn,
                    database: this.defaultDatabaseName,
                    sql: 'CREATE EXTENSION IF NOT EXISTS vector;'
                },
                physicalResourceId: PhysicalResourceId.of(cluster.clusterArn)
            },
            policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: [cluster.clusterArn] })
        })

        cluster.secret?.grantRead(query)
        cluster.grantDataApiAccess(query)

        return query
    }
}


export interface VectorStoreStackProps extends StackProps {

    readonly vpc: Vpc

}