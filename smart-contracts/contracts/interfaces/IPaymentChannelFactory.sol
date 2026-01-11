// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title IPaymentChannelFactory
 * @notice Interface for deploying and tracking PaymentChannel contracts
 * @dev Deploys one PaymentChannel contract per ERC20 token
 */
interface IPaymentChannelFactory {
	// ============ Events ============

	/**
	 * @notice Emitted when a new PaymentChannel contract is deployed
	 * @param token The ERC20 token address
	 * @param paymentChannel The deployed PaymentChannel contract address
	 */
	event PaymentChannelDeployed(address indexed token, address indexed paymentChannel);

	// ============ Errors ============

	error ChannelAlreadyExists();
	error ZeroAddress();

	// ============ Functions ============

	/**
	 * @notice Deploy a new PaymentChannel contract for a token
	 * @param token The ERC20 token address
	 * @return paymentChannel The deployed contract address
	 */
	function deployChannel(address token) external returns (address paymentChannel);

	/**
	 * @notice Get the PaymentChannel contract for a token
	 * @param token The ERC20 token address
	 * @return The contract address (address(0) if not deployed)
	 */
	function getPaymentChannel(address token) external view returns (address);

	/**
	 * @notice Check if a PaymentChannel exists for a token
	 * @param token The ERC20 token address
	 * @return True if deployed, false otherwise
	 */
	function exists(address token) external view returns (bool);
}
