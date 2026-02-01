export const PaymentChannelABI = [
	{
		inputs: [
			{
				internalType: 'address',
				name: '_token',
				type: 'address',
			},
		],
		stateMutability: 'nonpayable',
		type: 'constructor',
	},
	{
		inputs: [],
		name: 'ChallengeNonceTooLow',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ChannelAlreadyClosed',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ChannelAlreadyExists',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ChannelNotFound',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ECDSAInvalidSignature',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'uint256',
				name: 'length',
				type: 'uint256',
			},
		],
		name: 'ECDSAInvalidSignatureLength',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 's',
				type: 'bytes32',
			},
		],
		name: 'ECDSAInvalidSignatureS',
		type: 'error',
	},
	{
		inputs: [],
		name: 'InvalidAmount',
		type: 'error',
	},
	{
		inputs: [],
		name: 'InvalidBalanceSum',
		type: 'error',
	},
	{
		inputs: [],
		name: 'InvalidNonce',
		type: 'error',
	},
	{
		inputs: [],
		name: 'InvalidShortString',
		type: 'error',
	},
	{
		inputs: [],
		name: 'InvalidSignature',
		type: 'error',
	},
	{
		inputs: [],
		name: 'InvalidTimelock',
		type: 'error',
	},
	{
		inputs: [],
		name: 'InvalidToken',
		type: 'error',
	},
	{
		inputs: [],
		name: 'NoSettlementPending',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ReentrancyGuardReentrantCall',
		type: 'error',
	},
	{
		inputs: [],
		name: 'RequireSorted',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
		],
		name: 'SafeERC20FailedOperation',
		type: 'error',
	},
	{
		inputs: [],
		name: 'SameAddresses',
		type: 'error',
	},
	{
		inputs: [],
		name: 'SettlementNotMature',
		type: 'error',
	},
	{
		inputs: [],
		name: 'SettlementPending',
		type: 'error',
	},
	{
		inputs: [
			{
				internalType: 'string',
				name: 'str',
				type: 'string',
			},
		],
		name: 'StringTooLong',
		type: 'error',
	},
	{
		inputs: [],
		name: 'ZeroAddress',
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
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'balance0',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'balance1',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'nonce',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'newMaturity',
				type: 'uint256',
			},
		],
		name: 'ChallengeSubmitted',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
		],
		name: 'ChannelClosed',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'address0',
				type: 'address',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'address1',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'address',
				name: 'token',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'timelock',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'bytes32',
				name: 'salt',
				type: 'bytes32',
			},
		],
		name: 'ChannelCreated',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'source',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'newBalance',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'nonce',
				type: 'uint256',
			},
		],
		name: 'ChannelFunded',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [],
		name: 'EIP712DomainChanged',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'balance0',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'balance1',
				type: 'uint256',
			},
		],
		name: 'SettlementCooperative',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'payout0',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'payout1',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'bool',
				name: 'penaltyApplied',
				type: 'bool',
			},
		],
		name: 'SettlementExecuted',
		type: 'event',
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
			{
				indexed: true,
				internalType: 'address',
				name: 'submitter',
				type: 'address',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'balance0',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'balance1',
				type: 'uint256',
			},
			{
				indexed: false,
				internalType: 'uint256',
				name: 'maturity',
				type: 'uint256',
			},
		],
		name: 'SettlementProposed',
		type: 'event',
	},
	{
		inputs: [],
		name: 'BALANCE_TYPEHASH',
		outputs: [
			{
				internalType: 'bytes32',
				name: '',
				type: 'bytes32',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'CHANNELID_TYPEHASH',
		outputs: [
			{
				internalType: 'bytes32',
				name: '',
				type: 'bytes32',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'FUNDING_TYPEHASH',
		outputs: [
			{
				internalType: 'bytes32',
				name: '',
				type: 'bytes32',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'MIN_TIMELOCK',
		outputs: [
			{
				internalType: 'uint256',
				name: '',
				type: 'uint256',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'SETTLEMENT_NONCE',
		outputs: [
			{
				internalType: 'uint256',
				name: '',
				type: 'uint256',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'bytes32',
						name: 'channelId',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'balance0',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'balance1',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'nonce',
						type: 'uint256',
					},
				],
				internalType: 'struct IPaymentChannel.Balance',
				name: 'balance',
				type: 'tuple',
			},
			{
				internalType: 'bytes',
				name: 'sig0',
				type: 'bytes',
			},
			{
				internalType: 'bytes',
				name: 'sig1',
				type: 'bytes',
			},
		],
		name: 'challenge',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
		],
		name: 'closed',
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
				components: [
					{
						internalType: 'address',
						name: 'address0',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'address1',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'timelock',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'salt',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
					{
						internalType: 'bool',
						name: 'source',
						type: 'bool',
					},
					{
						internalType: 'uint256',
						name: 'nonce',
						type: 'uint256',
					},
				],
				internalType: 'struct IPaymentChannel.Funding',
				name: 'funding',
				type: 'tuple',
			},
		],
		name: 'computeChannelId',
		outputs: [
			{
				internalType: 'bytes32',
				name: '',
				type: 'bytes32',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [],
		name: 'eip712Domain',
		outputs: [
			{
				internalType: 'bytes1',
				name: 'fields',
				type: 'bytes1',
			},
			{
				internalType: 'string',
				name: 'name',
				type: 'string',
			},
			{
				internalType: 'string',
				name: 'version',
				type: 'string',
			},
			{
				internalType: 'uint256',
				name: 'chainId',
				type: 'uint256',
			},
			{
				internalType: 'address',
				name: 'verifyingContract',
				type: 'address',
			},
			{
				internalType: 'bytes32',
				name: 'salt',
				type: 'bytes32',
			},
			{
				internalType: 'uint256[]',
				name: 'extensions',
				type: 'uint256[]',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
		],
		name: 'executeSettlement',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'address',
						name: 'address0',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'address1',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'token',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'timelock',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'salt',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'amount',
						type: 'uint256',
					},
					{
						internalType: 'bool',
						name: 'source',
						type: 'bool',
					},
					{
						internalType: 'uint256',
						name: 'nonce',
						type: 'uint256',
					},
				],
				internalType: 'struct IPaymentChannel.Funding',
				name: 'funding',
				type: 'tuple',
			},
			{
				internalType: 'bytes',
				name: 'sig0',
				type: 'bytes',
			},
			{
				internalType: 'bytes',
				name: 'sig1',
				type: 'bytes',
			},
		],
		name: 'fund',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
		],
		name: 'getChallenge',
		outputs: [
			{
				components: [
					{
						internalType: 'bytes32',
						name: 'channelId',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'balance0',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'balance1',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'nonce',
						type: 'uint256',
					},
				],
				internalType: 'struct IPaymentChannel.Balance',
				name: '',
				type: 'tuple',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
		],
		name: 'getChannel',
		outputs: [
			{
				components: [
					{
						internalType: 'address',
						name: 'address0',
						type: 'address',
					},
					{
						internalType: 'address',
						name: 'address1',
						type: 'address',
					},
					{
						internalType: 'uint256',
						name: 'timelock',
						type: 'uint256',
					},
					{
						internalType: 'bytes32',
						name: 'salt',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'balance',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'nonce',
						type: 'uint256',
					},
					{
						internalType: 'bool',
						name: 'submitter',
						type: 'bool',
					},
					{
						internalType: 'uint256',
						name: 'maturity',
						type: 'uint256',
					},
				],
				internalType: 'struct IPaymentChannel.Channel',
				name: '',
				type: 'tuple',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
		],
		name: 'getSettlement',
		outputs: [
			{
				components: [
					{
						internalType: 'bytes32',
						name: 'channelId',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'balance0',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'balance1',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'nonce',
						type: 'uint256',
					},
				],
				internalType: 'struct IPaymentChannel.Balance',
				name: '',
				type: 'tuple',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'bytes32',
				name: 'channelId',
				type: 'bytes32',
			},
		],
		name: 'isClosed',
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
				components: [
					{
						internalType: 'bytes32',
						name: 'channelId',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'balance0',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'balance1',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'nonce',
						type: 'uint256',
					},
				],
				internalType: 'struct IPaymentChannel.Balance',
				name: 'balance',
				type: 'tuple',
			},
			{
				internalType: 'bytes',
				name: 'sig0',
				type: 'bytes',
			},
			{
				internalType: 'bytes',
				name: 'sig1',
				type: 'bytes',
			},
		],
		name: 'settleCooperative',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [
			{
				components: [
					{
						internalType: 'bytes32',
						name: 'channelId',
						type: 'bytes32',
					},
					{
						internalType: 'uint256',
						name: 'balance0',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'balance1',
						type: 'uint256',
					},
					{
						internalType: 'uint256',
						name: 'nonce',
						type: 'uint256',
					},
				],
				internalType: 'struct IPaymentChannel.Balance',
				name: 'balance',
				type: 'tuple',
			},
			{
				internalType: 'bytes',
				name: 'sig',
				type: 'bytes',
			},
		],
		name: 'settleUnilateral',
		outputs: [],
		stateMutability: 'nonpayable',
		type: 'function',
	},
	{
		inputs: [],
		name: 'token',
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
] as const;
