import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CeleryBrokerStack } from '../src/celery-broker-stack';
import { DifyEcsClusterStack, DifyEcsClusterStackProps } from '../src/dify-ecs-cluster-stack';
import { FileStoreStack } from '../src/file-store';
import { MetadataStoreStack } from '../src/metadata-store';
import { VpcStack as NetworkStack } from '../src/network-stack';
import { RedisStack } from '../src/redis-stack';
import { VectorStoreStack } from '../src/vector-store';

export class ServerlessDifyStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const network = new NetworkStack(this, 'NetworkStack')
		const storage = new FileStoreStack(this, 'StorageStack')

		const metadataStore = new MetadataStoreStack(this, 'MetadataStack', { vpc: network.vpc })
		const redis = new RedisStack(this, 'RedisStack', { vpc: network.vpc })
		const celeryBroker = new CeleryBrokerStack(this, 'CeleryBrokerStack', { vpc: network.vpc })
		const vectorStore = new VectorStoreStack(this, 'VectorStoreStack', { vpc: network.vpc })

		const ecsClusterStackProps: DifyEcsClusterStackProps = {
			vpc: network.vpc,
			celeryBroker: celeryBroker.cluster,
			redis: redis.cluster,
			metadataStore: metadataStore,
			vectorStore: vectorStore,
			storage: storage.bucket
		}
		const difyEcsCluster = new DifyEcsClusterStack(this, 'EcsClusterStack', ecsClusterStackProps)

		metadataStore.addDependency(network)
		vectorStore.addDependency(network)
		redis.addDependency(network)
		celeryBroker.addDependency(network)

		difyEcsCluster.addDependency(network)
		difyEcsCluster.addDependency(storage)
		difyEcsCluster.addDependency(metadataStore)
		difyEcsCluster.addDependency(redis)
		difyEcsCluster.addDependency(celeryBroker)
		difyEcsCluster.addDependency(vectorStore)
	}
}
