import { arbitrum, base, mainnet } from 'viem/chains';
import { Address, Chain } from 'viem';

// network and chains
export const ChainMain = { mainnet } as const;
export const ChainSide = {
	base,
	arbitrum,
} as const;

// supported chains
export const SupportedChains = { ...ChainMain, ...ChainSide } as const;
export type SupportedChain = (typeof SupportedChains)[keyof typeof SupportedChains];

export const SupportedChainsMap: { [K in ChainId]: SupportedChain | Chain } = {
	[mainnet.id]: mainnet,
	[base.id]: base,
	[arbitrum.id]: arbitrum,
} as const;

export const SupportedChainIds = Object.values(SupportedChains).map((chain) => chain.id);

// chain ids
export type ChainIdMain = typeof mainnet.id;

export type ChainIdSide = typeof arbitrum.id | typeof base.id;

export type ChainId = ChainIdMain | ChainIdSide;

// chain Address
export type ChainAddressMainnet = {
	// identifier
	chainId: typeof mainnet.id;
	chainSelector: string;

	paymentChannelFactory: Address;
};

export type ChainAddressArbitrum = {
	// identifier
	chainId: typeof arbitrum.id;
	chainSelector: string;
};

export type ChainAddressBase = {
	// identifier
	chainId: typeof base.id;
	chainSelector: string;
};

// ChainAddressMap aggregation
export type ChainAddressMap = {
	[mainnet.id]: ChainAddressMainnet;
	[arbitrum.id]: ChainAddressArbitrum;
	[base.id]: ChainAddressBase;
};
