import { arbitrum, base, mainnet } from 'viem/chains';
import { ChainAddressMap } from './address.types';
import { zeroAddress } from 'viem';

export const ADDRESS: ChainAddressMap = {
	[mainnet.id]: {
		// identifier
		chainId: 1,
		chainSelector: '5009297550715157269',

		paymentChannelFactory: zeroAddress,
	},
	[arbitrum.id]: {
		// identifier
		chainId: 42161,
		chainSelector: '4949039107694359620',
	},
	[base.id]: {
		// identifier
		chainId: 8453,
		chainSelector: '15971525489660198786',
	},
} as const;
