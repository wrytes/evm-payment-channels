// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import {IPaymentChannelFactory} from './interfaces/IPaymentChannelFactory.sol';
import {PaymentChannel} from './PaymentChannel.sol';

/**
 * @title PaymentChannelFactory
 * @notice Factory for deploying token-specific PaymentChannel contracts
 * @dev Deploys one PaymentChannel contract per ERC20 token
 */
contract PaymentChannelFactory is IPaymentChannelFactory {
	/// @notice Registry of deployed PaymentChannel contracts
	mapping(address token => address paymentChannel) public registry;

	/// @inheritdoc IPaymentChannelFactory
	function deployChannel(address token) external returns (address paymentChannel) {
		if (token == address(0)) revert ZeroAddress();
		if (registry[token] != address(0)) revert ChannelAlreadyExists();

		// Deploy new PaymentChannel contract for this token
		paymentChannel = address(new PaymentChannel(token));
		registry[token] = paymentChannel;

		emit PaymentChannelDeployed(token, paymentChannel);
	}

	/// @inheritdoc IPaymentChannelFactory
	function getPaymentChannel(address token) external view returns (address) {
		return registry[token];
	}

	/// @inheritdoc IPaymentChannelFactory
	function exists(address token) external view returns (bool) {
		return registry[token] != address(0);
	}
}
