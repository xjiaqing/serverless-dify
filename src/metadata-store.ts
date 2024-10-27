import { NestedStack, RemovalPolicy, StackProps } from "aws-cdk-lib";
import { Peer, Port, SecurityGroup, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { AuroraPostgresEngineVersion, ClusterInstance, Credentials, DatabaseCluster, DatabaseClusterEngine, SubnetGroup } from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class MetadataStoreStack extends NestedStack {

    private readonly port: number = 5432

    static readonly DEFAULT_DATABASE: string = 'dify'

    public readonly cluster: DatabaseCluster

    public readonly secret: Secret

    constructor(scope: Construct, id: string, props: MetadataStoreStackProps) {
        super(scope, id, props);

        // security group for dify metadata postgresql
        const sg = new SecurityGroup(scope, "MetadataStoreSecurityGroup", {
            vpc: props.vpc, allowAllOutbound: true
        });
        sg.addIngressRule(Peer.anyIpv4(), Port.tcp(this.port))

        // subnet group 
        const subnetGroup = new SubnetGroup(scope, 'MetadataStoreSubnetGroup', {
            description: 'DifyMetadataStore',
            vpc: props.vpc,
            removalPolicy: RemovalPolicy.DESTROY,
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
        });

        this.secret = new Secret(scope, 'MetadataStoreDatabaseSecret', {
            description: "serverless-dify metadata store secret.",
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'postgre' }),
                generateStringKey: 'password',
                excludePunctuation: true
            }
        })

        this.cluster = new DatabaseCluster(scope, 'MetadataStoreDatabaseCluster', {
            vpc: props.vpc,
            securityGroups: [sg],
            port: this.port,
            subnetGroup: subnetGroup,
            clusterIdentifier: 'MetadataStore',
            engine: DatabaseClusterEngine.auroraPostgres({ version: AuroraPostgresEngineVersion.VER_15_4 }),
            writer: ClusterInstance.serverlessV2('MetadataStoreServerlessWriteInstance'),
            cloudwatchLogsRetention: RetentionDays.ONE_WEEK,
            serverlessV2MinCapacity: 0.5,
            serverlessV2MaxCapacity: 2,
            iamAuthentication: true,
            enableDataApi: true,
            credentials: Credentials.fromSecret(this.secret),
            defaultDatabaseName: MetadataStoreStack.DEFAULT_DATABASE,
        })

        this.cluster.applyRemovalPolicy(RemovalPolicy.DESTROY)
    }
}


export interface MetadataStoreStackProps extends StackProps {

    /**
     * vpc configure
     */
    readonly vpc: Vpc;
}