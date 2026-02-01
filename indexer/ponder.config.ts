import { createConfig, factory } from 'ponder';
import { mainnet } from 'viem/chains';
import { Chain, createPublicClient, http, getAbiItem } from 'viem';
import {
	ADDRESS,
	PaymentChannelFactoryABI,
	PaymentChannelABI,
} from '../smart-contracts/exports';

export const config = {
	// core deployment
	[mainnet.id]: {
		rpc: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_RPC_KEY}`,
		maxRequestsPerSecond: parseInt(
			process.env.MAX_REQUESTS_PER_SECOND || '50',
		),
		pollingInterval: parseInt(process.env.POLLING_INTERVAL_MS || '5000'),

		// block numbers
		startPaymentChannelFactory: 0, // TODO: Update with actual deployment block
	},
};

export function getPublicClient(chain: Chain) {
	const chainConfig = config[chain.id as keyof typeof config];
	if (!chainConfig) {
		throw new Error(`Chain ${chain.id} not supported`);
	}
	return createPublicClient({
		chain,
		transport: http(chainConfig.rpc),
	});
}

export default createConfig({
	chains: {
		// ### NATIVE CHAIN SUPPORT ###
		[mainnet.name]: {
			id: mainnet.id,
			maxRequestsPerSecond: config[mainnet.id].maxRequestsPerSecond,
			pollingInterval: config[mainnet.id].pollingInterval,
			rpc: http(config[mainnet.id].rpc),
		},
	},
	contracts: {
		// ### PAYMENT CHANNEL CONTRACTS ###
		PaymentChannelFactory: {
			abi: PaymentChannelFactoryABI,
			chain: {
				[mainnet.name]: {
					address: ADDRESS[mainnet.id].paymentChannelFactory,
					startBlock: config[mainnet.id].startPaymentChannelFactory,
				},
			},
		},
		PaymentChannel: {
			abi: PaymentChannelABI,
			chain: {
				[mainnet.name]: {
					address: factory({
						address: ADDRESS[mainnet.id].paymentChannelFactory,
						event: getAbiItem({
							abi: PaymentChannelFactoryABI,
							name: 'PaymentChannelDeployed',
						}),
						parameter: 'paymentChannel',
					}),
					startBlock: config[mainnet.id].startPaymentChannelFactory,
				},
			},
		},
	},
});
