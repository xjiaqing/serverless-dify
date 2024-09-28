import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CeleryBrokerStack } from '../src/celery-broker-stack';
import { MetadataStorageStack } from '../src/metadata-storage';
import { VpcStack as NetworkStack } from '../src/network-stack';
import { RedisStack } from '../src/redis-stack';
import { StorageStack } from '../src/storage';

export class ServerlessDifyStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const network = new NetworkStack(this, 'dify-vpc')
		const metadataStorage = new MetadataStorageStack(this, 'dify-metadata', { vpc: network.vpc })
		const redis = new RedisStack(this, 'dify-redis', { vpc: network.vpc })
		const celeryBroker = new CeleryBrokerStack(this, 'dify-celery-broker', { vpc: network.vpc })
		const storage = new StorageStack(this, 'dify-storage')


		// add dependency to ensure the order of resource creation
		metadataStorage.addDependency(network)
		redis.addDependency(network)
		celeryBroker.addDependency(network)
	}
}
