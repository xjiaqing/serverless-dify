import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CeleryBrokerStack } from '../src/celery-broker-stack';
import { MetadataStoreStack } from '../src/metadata-store';
import { VpcStack as NetworkStack } from '../src/network-stack';
import { RedisStack } from '../src/redis-stack';
import { StorageStack } from '../src/storage';
import { VectorStoreStack } from '../src/vector-store';

export class ServerlessDifyStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const network = new NetworkStack(this, 'DifyNetwork')
		const metadataStore = new MetadataStoreStack(this, 'DifyMetadata', { vpc: network.vpc })
		const redis = new RedisStack(this, 'DifyRedis', { vpc: network.vpc })
		const celeryBroker = new CeleryBrokerStack(this, 'DifyCeleryBroker', { vpc: network.vpc })
		const storage = new StorageStack(this, 'DifyStorage')
		const vectorStore = new VectorStoreStack(this, 'DifyVectorStore', { vpc: network.vpc })


		// add dependency to ensure the order of resource creation
		metadataStore.addDependency(network)
		redis.addDependency(network)
		celeryBroker.addDependency(network)
		vectorStore.addDependency(network)
	}
}
