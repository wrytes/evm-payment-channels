// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IPaymentChannel} from './interfaces/IPaymentChannel.sol';
import {ChannelLib} from './libraries/ChannelLib.sol';
import {EIP712} from '@openzeppelin/contracts/utils/cryptography/EIP712.sol';
import {ECDSA} from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import {ReentrancyGuard} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import {SafeERC20} from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title PaymentChannel
 * @notice Bilateral payment channel with EIP-712 signatures and optimistic settlement
 * @dev One contract per token, deployed by PaymentChannelFactory
 */
contract PaymentChannel is IPaymentChannel, EIP712, ReentrancyGuard {
	using SafeERC20 for IERC20;
	using ChannelLib for address;

	// ============ Constants ============

	/// @notice Minimum timelock duration (3 days)
	uint256 public constant MIN_TIMELOCK = 3 days;

	/// @notice Settlement nonce (max uint256)
	uint256 public constant SETTLEMENT_NONCE = type(uint256).max;

	/// @notice EIP-712 typehash for Funding struct
	bytes32 public constant CHANNELID_TYPEHASH =
		keccak256('ChannelId(address address0,address address1,address token,uint256 timelock,bytes32 salt)');

	/// @notice EIP-712 typehash for Funding struct
	bytes32 public constant FUNDING_TYPEHASH =
		keccak256(
			'Funding(address address0,address address1,address token,uint256 timelock,bytes32 salt,uint256 amount,bool source,uint256 nonce)'
		);

	/// @notice EIP-712 typehash for Balance struct
	bytes32 public constant BALANCE_TYPEHASH =
		keccak256('Balance(bytes32 channelId,uint256 balance0,uint256 balance1,uint256 nonce)');

	// ============ Immutables ============

	/// @notice The ERC20 token for this PaymentChannel
	address public immutable token;

	// ============ Storage ============

	/// @notice Permanently closed channels
	mapping(bytes32 channelId => bool) public closed;

	/// @notice Channel on-chain state
	mapping(bytes32 channelId => Channel) internal _channels;

	/// @notice Pending settlement proposals
	mapping(bytes32 channelId => Balance) internal _settlements;

	/// @notice Challenge states during dispute
	mapping(bytes32 channelId => Balance) internal _challenges;

	// ============ Constructor ============

	/**
	 * @param _token The ERC20 token address for this PaymentChannel
	 */
	constructor(address _token) EIP712('PaymentChannel', '1') {
		token = _token;
	}

	// ============ Modifiers ============

	modifier notClosed(bytes32 channelId) {
		if (closed[channelId]) revert ChannelAlreadyClosed();
		_;
	}

	// ============ External Functions ============

	/// @inheritdoc IPaymentChannel
	function fund(Funding calldata funding, bytes calldata sig0, bytes calldata sig1) external nonReentrant {
		// Validate addresses are sorted
		ChannelLib.requireSorted(funding.address0, funding.address1);

		// Validate token matches
		if (funding.token != token) revert InvalidToken();

		// Validate amount
		if (funding.amount == 0) revert InvalidAmount();

		// Compute channelId
		bytes32 channelId = _computeChannelId(funding);

		// Check channel not closed
		if (closed[channelId]) revert ChannelAlreadyClosed();

		// Verify signatures
		bytes32 fundingHash = _hashFunding(funding);
		_verifySignature(fundingHash, sig0, funding.address0);
		_verifySignature(fundingHash, sig1, funding.address1);

		Channel storage channel = _channels[channelId];

		// Transfer tokens first (fail-fast, nonReentrant protects against reentrancy)
		address source = funding.source ? funding.address1 : funding.address0;
		IERC20(token).safeTransferFrom(source, address(this), funding.amount);

		// Update state after successful transfer
		if (funding.nonce == 0) {
			// Channel creation
			if (channel.address0 != address(0)) revert ChannelAlreadyExists();
			if (funding.timelock < MIN_TIMELOCK) revert InvalidTimelock();

			channel.address0 = funding.address0;
			channel.address1 = funding.address1;
			channel.timelock = funding.timelock;
			channel.salt = funding.salt;
			channel.nonce = 1;
			channel.balance = funding.amount;

			emit ChannelCreated(
				channelId,
				funding.address0,
				funding.address1,
				funding.token,
				funding.timelock,
				funding.salt
			);
		} else {
			// Additional funding
			if (channel.address0 == address(0)) revert ChannelNotFound();
			if (funding.nonce <= channel.nonce) revert InvalidNonce();

			channel.nonce = funding.nonce + 1;
			channel.balance += funding.amount;
		}

		emit ChannelFunded(channelId, source, funding.amount, channel.balance, channel.nonce);
	}

	/// @inheritdoc IPaymentChannel
	function settleCooperative(
		Balance calldata balance,
		bytes calldata sig0,
		bytes calldata sig1
	) external nonReentrant notClosed(balance.channelId) {
		Channel storage channel = _channels[balance.channelId];
		if (channel.address0 == address(0)) revert ChannelNotFound();

		// Validate settlement nonce
		if (balance.nonce != SETTLEMENT_NONCE) revert InvalidNonce();

		// Validate balance sum
		if (balance.balance0 + balance.balance1 != channel.balance) revert InvalidBalanceSum();

		// Verify both signatures
		bytes32 balanceHash = _hashBalance(balance);
		_verifySignature(balanceHash, sig0, channel.address0);
		_verifySignature(balanceHash, sig1, channel.address1);

		// Execute immediate payout
		_executePayout(balance.channelId, channel, balance.balance0, balance.balance1, false);

		emit SettlementCooperative(balance.channelId, balance.balance0, balance.balance1);
	}

	/// @inheritdoc IPaymentChannel
	function settleUnilateral(
		Balance calldata balance,
		bytes calldata sig
	) external nonReentrant notClosed(balance.channelId) {
		Channel storage channel = _channels[balance.channelId];
		if (channel.address0 == address(0)) revert ChannelNotFound();

		// Cannot start new settlement if one is pending (use settleCooperative to override)
		if (channel.maturity != 0) revert SettlementPending();

		// Validate settlement nonce
		if (balance.nonce != SETTLEMENT_NONCE) revert InvalidNonce();

		// Validate balance sum
		if (balance.balance0 + balance.balance1 != channel.balance) revert InvalidBalanceSum();

		// Verify signature and determine submitter
		bytes32 balanceHash = _hashBalance(balance);
		address signer = ECDSA.recover(balanceHash, sig);

		bool submitter;
		if (signer == channel.address0) {
			submitter = false;
		} else if (signer == channel.address1) {
			submitter = true;
		} else {
			revert InvalidSignature();
		}

		// Store settlement proposal
		_settlements[balance.channelId] = balance;
		channel.submitter = submitter;
		channel.maturity = block.timestamp + channel.timelock;

		emit SettlementProposed(
			balance.channelId,
			submitter ? channel.address1 : channel.address0,
			balance.balance0,
			balance.balance1,
			channel.maturity
		);
	}

	/// @inheritdoc IPaymentChannel
	function challenge(
		Balance calldata balance,
		bytes calldata sig0,
		bytes calldata sig1
	) external nonReentrant notClosed(balance.channelId) {
		Channel storage channel = _channels[balance.channelId];
		if (channel.address0 == address(0)) revert ChannelNotFound();

		// Must have a pending settlement
		if (channel.maturity == 0) revert NoSettlementPending();

		// Challenge nonce must be less than settlement nonce
		if (balance.nonce >= SETTLEMENT_NONCE) revert InvalidNonce();

		// Challenge nonce must be higher than current challenge
		Balance storage currentChallenge = _challenges[balance.channelId];
		if (currentChallenge.nonce != 0 && balance.nonce <= currentChallenge.nonce) {
			revert ChallengeNonceTooLow();
		}

		// Validate balance sum
		if (balance.balance0 + balance.balance1 != channel.balance) revert InvalidBalanceSum();

		// Verify both signatures
		bytes32 balanceHash = _hashBalance(balance);
		_verifySignature(balanceHash, sig0, channel.address0);
		_verifySignature(balanceHash, sig1, channel.address1);

		// Store challenge and reset timelock
		_challenges[balance.channelId] = balance;
		channel.maturity = block.timestamp + channel.timelock;

		emit ChallengeSubmitted(balance.channelId, balance.balance0, balance.balance1, balance.nonce, channel.maturity);
	}

	/// @inheritdoc IPaymentChannel
	function executeSettlement(bytes32 channelId) external nonReentrant notClosed(channelId) {
		Channel storage channel = _channels[channelId];
		if (channel.address0 == address(0)) revert ChannelNotFound();

		// Must have a pending settlement
		if (channel.maturity == 0) revert NoSettlementPending();

		// Must be past maturity
		if (block.timestamp < channel.maturity) revert SettlementNotMature();

		Balance storage settlement = _settlements[channelId];
		Balance storage challengeState = _challenges[channelId];

		uint256 payout0;
		uint256 payout1;
		bool penaltyApplied = false;

		if (challengeState.nonce == 0) {
			// No challenge - use settlement balances
			payout0 = settlement.balance0;
			payout1 = settlement.balance1;
		} else {
			// Challenge exists - apply winner-takes-all penalty
			penaltyApplied = true;

			bool balancesMatch = (settlement.balance0 == challengeState.balance0 &&
				settlement.balance1 == challengeState.balance1);

			if (balancesMatch) {
				// Unnecessary challenge - submitter wins all
				if (channel.submitter) {
					// address1 was submitter
					payout0 = 0;
					payout1 = channel.balance;
				} else {
					// address0 was submitter
					payout0 = channel.balance;
					payout1 = 0;
				}
			} else {
				// Submitter cheated - challenger wins all
				if (channel.submitter) {
					// address1 was dishonest submitter, address0 wins
					payout0 = channel.balance;
					payout1 = 0;
				} else {
					// address0 was dishonest submitter, address1 wins
					payout0 = 0;
					payout1 = channel.balance;
				}
			}
		}

		// Execute payout
		_executePayout(channelId, channel, payout0, payout1, penaltyApplied);
	}

	// ============ View Functions ============

	/// @inheritdoc IPaymentChannel
	function computeChannelId(Funding calldata funding) external view returns (bytes32) {
		return _computeChannelId(funding);
	}

	/// @inheritdoc IPaymentChannel
	function getChannel(bytes32 channelId) external view returns (Channel memory) {
		return _channels[channelId];
	}

	/// @inheritdoc IPaymentChannel
	function getSettlement(bytes32 channelId) external view returns (Balance memory) {
		return _settlements[channelId];
	}

	/// @inheritdoc IPaymentChannel
	function getChallenge(bytes32 channelId) external view returns (Balance memory) {
		return _challenges[channelId];
	}

	/// @inheritdoc IPaymentChannel
	function isClosed(bytes32 channelId) external view returns (bool) {
		return closed[channelId];
	}

	// ============ Internal Functions ============

	/**
	 * @dev Compute channelId from funding parameters
	 * @notice channelId is fixed at creation (based on addresses, token, timelock and salt)
	 */
	function _computeChannelId(Funding calldata funding) internal view returns (bytes32) {
		// Create a deterministic channelId based on the channel's immutable properties
		// We use a simplified struct that doesn't include amount/source/nonce which change
		return
			_hashTypedDataV4(
				keccak256(
					abi.encode(
						CHANNELID_TYPEHASH,
						funding.address0,
						funding.address1,
						funding.token,
						funding.timelock,
						funding.salt
					)
				)
			);
	}

	/**
	 * @dev Hash Funding struct for EIP-712 signing
	 */
	function _hashFunding(Funding calldata funding) internal view returns (bytes32) {
		return
			_hashTypedDataV4(
				keccak256(
					abi.encode(
						FUNDING_TYPEHASH,
						funding.address0,
						funding.address1,
						funding.token,
						funding.timelock,
						funding.salt,
						funding.amount,
						funding.source,
						funding.nonce
					)
				)
			);
	}

	/**
	 * @dev Hash Balance struct for EIP-712 signing
	 */
	function _hashBalance(Balance calldata balance) internal view returns (bytes32) {
		return
			_hashTypedDataV4(
				keccak256(
					abi.encode(BALANCE_TYPEHASH, balance.channelId, balance.balance0, balance.balance1, balance.nonce)
				)
			);
	}

	/**
	 * @dev Verify EIP-712 signature
	 */
	function _verifySignature(bytes32 structHash, bytes calldata sig, address expected) internal pure {
		address recovered = ECDSA.recover(structHash, sig);
		if (recovered != expected) revert InvalidSignature();
	}

	/**
	 * @dev Execute payout and close channel
	 */
	function _executePayout(
		bytes32 channelId,
		Channel storage channel,
		uint256 payout0,
		uint256 payout1,
		bool penaltyApplied
	) internal {
		address addr0 = channel.address0;
		address addr1 = channel.address1;

		// Mark channel as closed
		closed[channelId] = true;

		// Clean up storage
		delete _channels[channelId];
		delete _settlements[channelId];
		delete _challenges[channelId];

		// Transfer payouts
		if (payout0 > 0) {
			IERC20(token).safeTransfer(addr0, payout0);
		}
		if (payout1 > 0) {
			IERC20(token).safeTransfer(addr1, payout1);
		}

		emit SettlementExecuted(channelId, payout0, payout1, penaltyApplied);
		emit ChannelClosed(channelId);
	}
}
