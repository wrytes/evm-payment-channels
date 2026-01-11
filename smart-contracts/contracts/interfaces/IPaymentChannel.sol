// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title IPaymentChannel
 * @notice Interface for bilateral payment channels with EIP-712 signature verification
 * @dev Each PaymentChannel contract is deployed per token by the factory
 */
interface IPaymentChannel {
	// ============ Structs ============

	/**
	 * @notice On-chain channel state
	 * @param address0 Lower address (lexicographically sorted)
	 * @param address1 Higher address (lexicographically sorted)
	 * @param balance Total on-chain deposits
	 * @param nonce Funding round counter (increments with each fund())
	 * @param timelock Challenge period duration in seconds
	 * @param submitter Who initiated unilateral settlement (false=address0, true=address1)
	 * @param maturity Timestamp when settlement can execute (0=no pending settlement)
	 */
	struct Channel {
		address address0;
		address address1;
		uint256 balance;
		uint256 nonce;
		uint256 timelock;
		bool submitter;
		uint256 maturity;
	}

	/**
	 * @notice Funding authorization (EIP-712 signed by both parties)
	 * @param address0 Lower address (sorted)
	 * @param address1 Higher address (sorted)
	 * @param token Token address (must match contract's token)
	 * @param amount Amount to deposit
	 * @param source Who is funding (false=address0, true=address1)
	 * @param nonce 0 for channel creation, >channel.nonce for additional funding
	 * @param timelock Challenge period duration (only used on channel creation)
	 * @param salt Unique identifier allowing multiple channels between same parties
	 */
	struct Funding {
		address address0;
		address address1;
		address token;
		uint256 amount;
		bool source;
		uint256 nonce;
		uint256 timelock;
		bytes32 salt;
	}

	/**
	 * @notice Balance state (EIP-712 signed, used off-chain and for settlement/challenge)
	 * @param channelId Unique channel identifier
	 * @param balance0 address0's balance allocation
	 * @param balance1 address1's balance allocation
	 * @param nonce State version (type(uint256).max for settlement, < max for challenges)
	 */
	struct Balance {
		bytes32 channelId;
		uint256 balance0;
		uint256 balance1;
		uint256 nonce;
	}

	// ============ Events ============

	/**
	 * @notice Emitted when a new channel is created
	 */
	event ChannelCreated(
		bytes32 indexed channelId,
		address indexed address0,
		address indexed address1,
		uint256 timelock
	);

	/**
	 * @notice Emitted when a channel is funded
	 */
	event ChannelFunded(
		bytes32 indexed channelId,
		address indexed source,
		uint256 amount,
		uint256 newBalance,
		uint256 nonce
	);

	/**
	 * @notice Emitted when a unilateral settlement is proposed
	 */
	event SettlementProposed(
		bytes32 indexed channelId,
		address indexed submitter,
		uint256 balance0,
		uint256 balance1,
		uint256 maturity
	);

	/**
	 * @notice Emitted when a cooperative settlement is executed
	 */
	event SettlementCooperative(bytes32 indexed channelId, uint256 balance0, uint256 balance1);

	/**
	 * @notice Emitted when a challenge is submitted
	 */
	event ChallengeSubmitted(
		bytes32 indexed channelId,
		uint256 balance0,
		uint256 balance1,
		uint256 nonce,
		uint256 newMaturity
	);

	/**
	 * @notice Emitted when settlement is executed after maturity
	 */
	event SettlementExecuted(
		bytes32 indexed channelId,
		uint256 payout0,
		uint256 payout1,
		bool penaltyApplied
	);

	/**
	 * @notice Emitted when a channel is permanently closed
	 */
	event ChannelClosed(bytes32 indexed channelId);

	// ============ Errors ============

	error ChannelAlreadyClosed();
	error ChannelNotFound();
	error ChannelAlreadyExists();
	error InvalidSignature();
	error InvalidNonce();
	error InvalidAmount();
	error InvalidTimelock();
	error InvalidBalanceSum();
	error InvalidToken();
	error SameAddresses();
	error ZeroAddress();
	error SettlementPending();
	error NoSettlementPending();
	error SettlementNotMature();
	error ChallengeNonceTooLow();

	// ============ Core Functions ============

	/**
	 * @notice Create or fund a channel with both signatures
	 * @param funding The funding parameters
	 * @param sig0 EIP-712 signature from address0
	 * @param sig1 EIP-712 signature from address1
	 */
	function fund(Funding calldata funding, bytes calldata sig0, bytes calldata sig1) external;

	/**
	 * @notice Cooperative settlement with both signatures (instant payout)
	 * @param balance The final balance state (nonce must be type(uint256).max)
	 * @param sig0 EIP-712 signature from address0
	 * @param sig1 EIP-712 signature from address1
	 */
	function settleCooperative(
		Balance calldata balance,
		bytes calldata sig0,
		bytes calldata sig1
	) external;

	/**
	 * @notice Unilateral settlement with one signature (starts challenge period)
	 * @param balance The proposed balance state (nonce must be type(uint256).max)
	 * @param sig EIP-712 signature from one party
	 */
	function settleUnilateral(Balance calldata balance, bytes calldata sig) external;

	/**
	 * @notice Submit a challenge during dispute period
	 * @param balance A higher-nonce balance state (nonce must be < type(uint256).max)
	 * @param sig0 EIP-712 signature from address0
	 * @param sig1 EIP-712 signature from address1
	 */
	function challenge(Balance calldata balance, bytes calldata sig0, bytes calldata sig1) external;

	/**
	 * @notice Execute settlement after maturity
	 * @param channelId The channel to finalize
	 */
	function executeSettlement(bytes32 channelId) external;

	// ============ View Functions ============

	/**
	 * @notice Get the token address for this PaymentChannel contract
	 */
	function token() external view returns (address);

	/**
	 * @notice Compute channelId from funding parameters (nonce must be 0)
	 */
	function computeChannelId(Funding calldata funding) external view returns (bytes32);

	/**
	 * @notice Get channel details
	 */
	function getChannel(bytes32 channelId) external view returns (Channel memory);

	/**
	 * @notice Get pending settlement
	 */
	function getSettlement(bytes32 channelId) external view returns (Balance memory);

	/**
	 * @notice Get current challenge
	 */
	function getChallenge(bytes32 channelId) external view returns (Balance memory);

	/**
	 * @notice Check if channel is closed
	 */
	function isClosed(bytes32 channelId) external view returns (bool);
}
