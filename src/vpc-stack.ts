import { Stack, StackProps } from "aws-cdk-lib";
import { IpAddresses, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";


export class VpcStack extends Stack {

    public readonly vpc: Vpc;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        this.vpc = new Vpc(this, 'serverless-dify-vpc', {
            enableDnsHostnames: true,
            enableDnsSupport: true,
            ipAddresses: IpAddresses.cidr("10.0.0.0/16"),

            natGateways: 1,
            natGatewaySubnets: { subnetType: SubnetType.PUBLIC }
        });
    }
}