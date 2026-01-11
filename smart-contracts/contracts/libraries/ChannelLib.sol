// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title ChannelLib
 * @notice Library for payment channel utilities
 */
library ChannelLib {
	error SameAddresses();
	error RequireSorted();
	error ZeroAddress();

	/**
	 * @notice Sort two addresses lexicographically
	 * @param a First address
	 * @param b Second address
	 * @return lower The lower address
	 * @return higher The higher address
	 */
	function sortAddresses(address a, address b) internal pure returns (address lower, address higher) {
		if (a == b) revert SameAddresses();
		if (a == address(0) || b == address(0)) revert ZeroAddress();
		return a < b ? (a, b) : (b, a);
	}

	/**
	 * @notice Check if addresses are properly sorted
	 * @param address0 Should be lower address
	 * @param address1 Should be higher address
	 * @return True if properly sorted
	 */
	function isSorted(address address0, address address1) internal pure returns (bool) {
		return address0 < address1 && address0 != address(0) && address1 != address(0);
	}

	/**
	 * @notice Verify addresses are valid and sorted, revert if not
	 * @param address0 Should be lower address
	 * @param address1 Should be higher address
	 */
	function requireSorted(address address0, address address1) internal pure {
		if (address0 == address(0) || address1 == address(0)) revert ZeroAddress();
		if (address0 >= address1) revert RequireSorted();
	}
}
