import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DifyRedisStack } from '../src/dify-redis-stack';
import { MetadataStorageStack } from '../src/metadata-storage';
import { VpcStack } from '../src/vpc-stack';

export class ServerlessDifyStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const network = new VpcStack(this, 'dify-vpc')

		new MetadataStorageStack(this, 'dify-metadata-storage', { vpc: network.vpc })

		new DifyRedisStack(this, 'dify-redis', { vpc: network.vpc })
	}
}
