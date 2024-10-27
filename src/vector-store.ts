import { NestedStack, RemovalPolicy, StackProps } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { AuroraPostgresEngineVersion, ClusterInstance, Credentials, DatabaseCluster, DatabaseClusterEngine, SubnetGroup } from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";



export class VectorStoreStack extends NestedStack {

    private readonly port: number = 5432

    static readonly DEFAULT_DATABASE: string = 'dify'

    public readonly cluster: DatabaseCluster

    public readonly secret: Secret

    constructor(scope: Construct, id: string, props: VectorStoreStackProps) {
        super(scope, id, props)

        const sg = new SecurityGroup(scope, "VectorStoreSecurityGroup", { vpc: props.vpc, allowAllOutbound: true })
        sg.addIngressRule(Peer.anyIpv4(), Port.tcp(this.port))

        const subnetGroup = new SubnetGroup(scope, 'VectorStoreSubnetGroup', {
            description: 'DifyVectorStore',
            vpc: props.vpc,
            removalPolicy: RemovalPolicy.DESTROY,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        this.secret = new Secret(scope, 'VectorStoreDatabaseSecret', {
            description: "serverless-dify vector store secret.",
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'postgre' }),
                generateStringKey: 'password',
                excludePunctuation: true
            }
        })


        this.cluster = new DatabaseCluster(scope, 'VectorStoreInstanceCluster', {
            vpc: props.vpc,
            securityGroups: [sg],
            port: this.port,
            subnetGroup: subnetGroup,
            clusterIdentifier: 'VectorStore',
            engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_15_4 }),
            writer: ClusterInstance.serverlessV2('DifyVectorStore'),
            cloudwatchLogsRetention: RetentionDays.ONE_WEEK,
            serverlessV2MinCapacity: 0.5,
            serverlessV2MaxCapacity: 2,
            iamAuthentication: true,
            enableDataApi: true,
            credentials: Credentials.fromSecret(this.secret),
            defaultDatabaseName: VectorStoreStack.DEFAULT_DATABASE
        })

        const query = this.enablePgvector()
        this.cluster.secret?.grantRead(query)
        this.cluster.grantDataApiAccess(query)

        query.node.addDependency(this.cluster)
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
                    database: VectorStoreStack.DEFAULT_DATABASE,
                    sql: 'CREATE EXTENSION IF NOT EXISTS vector;'
                },
                physicalResourceId: PhysicalResourceId.of(cluster.clusterArn)
            },
            policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: [cluster.clusterArn] })
        })

        return query
    }
}


export interface VectorStoreStackProps extends StackProps {

    readonly vpc: Vpc

}