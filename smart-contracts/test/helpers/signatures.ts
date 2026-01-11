import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';

// EIP-712 Type Hashes
export const CHANNELID_TYPEHASH = ethers.keccak256(
	ethers.toUtf8Bytes('ChannelId(address address0,address address1,address token,uint256 timelock,bytes32 salt)')
);

export const FUNDING_TYPEHASH = ethers.keccak256(
	ethers.toUtf8Bytes(
		'Funding(address address0,address address1,address token,uint256 timelock,bytes32 salt,uint256 amount,bool source,uint256 nonce)'
	)
);

export const BALANCE_TYPEHASH = ethers.keccak256(
	ethers.toUtf8Bytes('Balance(bytes32 channelId,uint256 balance0,uint256 balance1,uint256 nonce)')
);

// EIP-712 Domain
export interface EIP712Domain {
	name: string;
	version: string;
	chainId: bigint;
	verifyingContract: string;
}

// Funding Struct
export interface Funding {
	address0: string;
	address1: string;
	token: string;
	timelock: bigint;
	salt: string;
	amount: bigint;
	source: boolean;
	nonce: bigint;
}

// Balance Struct
export interface Balance {
	channelId: string;
	balance0: bigint;
	balance1: bigint;
	nonce: bigint;
}

/**
 * Get EIP-712 domain for PaymentChannel contract
 */
export function getDomain(contractAddress: string, chainId: bigint): EIP712Domain {
	return {
		name: 'PaymentChannel',
		version: '1',
		chainId,
		verifyingContract: contractAddress,
	};
}

/**
 * Sort two addresses lexicographically
 */
export function sortAddresses(a: string, b: string): [string, string] {
	const aLower = a.toLowerCase();
	const bLower = b.toLowerCase();
	return aLower < bLower ? [a, b] : [b, a];
}

/**
 * Create a sorted Funding struct
 */
export function createFunding(
	addr0: string,
	addr1: string,
	token: string,
	timelock: bigint,
	salt: string,
	amount: bigint,
	source: boolean,
	nonce: bigint
): Funding {
	const [address0, address1] = sortAddresses(addr0, addr1);
	return {
		address0,
		address1,
		token,
		timelock,
		salt,
		amount,
		source,
		nonce,
	};
}

/**
 * Sign a Funding struct
 */
export async function signFunding(signer: SignerWithAddress, domain: EIP712Domain, funding: Funding): Promise<string> {
	const types = {
		Funding: [
			{ name: 'address0', type: 'address' },
			{ name: 'address1', type: 'address' },
			{ name: 'token', type: 'address' },
			{ name: 'timelock', type: 'uint256' },
			{ name: 'salt', type: 'bytes32' },
			{ name: 'amount', type: 'uint256' },
			{ name: 'source', type: 'bool' },
			{ name: 'nonce', type: 'uint256' },
		],
	};

	return await signer.signTypedData(domain, types, funding);
}

/**
 * Sign a Balance struct
 */
export async function signBalance(signer: SignerWithAddress, domain: EIP712Domain, balance: Balance): Promise<string> {
	const types = {
		Balance: [
			{ name: 'channelId', type: 'bytes32' },
			{ name: 'balance0', type: 'uint256' },
			{ name: 'balance1', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
		],
	};

	return await signer.signTypedData(domain, types, balance);
}

/**
 * Compute channelId from funding parameters
 */
export function computeChannelId(
	domain: EIP712Domain,
	address0: string,
	address1: string,
	token: string,
	timelock: bigint,
	salt: string
): string {
	const domainSeparator = ethers.TypedDataEncoder.hashDomain(domain);

	const structHash = ethers.keccak256(
		ethers.AbiCoder.defaultAbiCoder().encode(
			['bytes32', 'address', 'address', 'address', 'uint256', 'bytes32'],
			[CHANNELID_TYPEHASH, address0, address1, token, timelock, salt]
		)
	);

	return ethers.keccak256(ethers.concat(['0x1901', domainSeparator, structHash]));
}

/**
 * Generate random salt
 */
export function randomSalt(): string {
	return ethers.hexlify(ethers.randomBytes(32));
}

/**
 * Constants
 */
export const SETTLEMENT_NONCE = ethers.MaxUint256;
export const MIN_TIMELOCK = 3n * 24n * 60n * 60n; // 3 days in seconds
export const ZERO_ADDRESS = ethers.ZeroAddress;
export const ZERO_BYTES32 = ethers.ZeroHash;
