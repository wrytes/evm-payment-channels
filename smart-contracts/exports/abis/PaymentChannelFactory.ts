export const PaymentChannelFactoryABI = [
	{
		inputs: [],
		name: 'ChannelAlreadyExists',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ZeroAddress',
		type: 'error',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'paymentChannel',
				type: 'address',
			},
		],
		name: 'PaymentChannelDeployed',
		type: 'event',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
		],
		name: 'deployChannel',
		outputs: [
			{
				internalType: 'address',
				name: 'paymentChannel',
				type: 'address',
			},
		],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
		],
		name: 'exists',
		outputs: [
			{
				internalType: 'bool',
				name: '',
				type: 'bool',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
		],
		name: 'getPaymentChannel',
		outputs: [
			{
				internalType: 'address',
				name: '',
				type: 'address',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
		],
		name: 'registry',
		outputs: [
			{
				internalType: 'address',
				name: 'paymentChannel',
				type: 'address',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
] as const;
