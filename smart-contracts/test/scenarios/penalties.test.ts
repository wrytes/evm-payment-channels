import { expect } from 'chai';
import { ethers } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { deployFixture, deployPaymentChannel, approveTokens } from '../helpers/fixtures';
import {
	createFunding,
	signFunding,
	signBalance,
	sortAddresses,
	randomSalt,
	computeChannelId,
	MIN_TIMELOCK,
	SETTLEMENT_NONCE,
	Balance,
} from '../helpers/signatures';

describe('PaymentChannel - Penalties', function () {
	describe('Execute Settlement without Challenge', function () {
		it('Should execute settlement with proposed balances after maturity', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();

			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('100'),
				false,
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sigF0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sigF1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await paymentChannel.fund(funding, sigF0, sigF1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Start settlement
			const settlementBalance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettlement = await signBalance(alice, domain, settlementBalance);
			await paymentChannel.settleUnilateral(settlementBalance, sigSettlement);

			// Wait for maturity
			await time.increase(MIN_TIMELOCK);

			// Get balances before
			const aliceBalanceBefore = await token.balanceOf(alice.address);
			const bobBalanceBefore = await token.balanceOf(bob.address);

			// Execute settlement
			await expect(paymentChannel.executeSettlement(channelId))
				.to.emit(paymentChannel, 'SettlementExecuted')
				.withArgs(channelId, settlementBalance.balance0, settlementBalance.balance1, false);

			// Verify payouts
			const aliceBalanceAfter = await token.balanceOf(alice.address);
			const bobBalanceAfter = await token.balanceOf(bob.address);

			if (address0 === alice.address) {
				expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(settlementBalance.balance0);
				expect(bobBalanceAfter - bobBalanceBefore).to.equal(settlementBalance.balance1);
			} else {
				expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(settlementBalance.balance1);
				expect(bobBalanceAfter - bobBalanceBefore).to.equal(settlementBalance.balance0);
			}

			// Channel should be closed
			expect(await paymentChannel.isClosed(channelId)).to.be.true;
		});

		it('Should revert if maturity not reached', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();

			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('100'),
				false,
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sigF0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sigF1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await paymentChannel.fund(funding, sigF0, sigF1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Start settlement
			const settlementBalance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettlement = await signBalance(alice, domain, settlementBalance);
			await paymentChannel.settleUnilateral(settlementBalance, sigSettlement);

			// Try to execute before maturity
			await expect(paymentChannel.executeSettlement(channelId)).to.be.revertedWithCustomError(
				paymentChannel,
				'SettlementNotMature'
			);
		});
	});

	describe('Penalty: Dishonest Submitter (Balances Differ)', function () {
		it('Should penalize submitter when challenge proves different balances', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const totalAmount = ethers.parseEther('100');

			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				totalAmount,
				false,
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sigF0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sigF1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await paymentChannel.fund(funding, sigF0, sigF1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Alice submits fraudulent settlement (trying to take 80 instead of 60)
			const fraudulentSettlement: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('80') : ethers.parseEther('20'),
				balance1: address0 === alice.address ? ethers.parseEther('20') : ethers.parseEther('80'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigFraud = await signBalance(alice, domain, fraudulentSettlement);
			await paymentChannel.settleUnilateral(fraudulentSettlement, sigFraud);

			// Bob challenges with correct balances
			const correctBalance: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('60') : ethers.parseEther('40'),
				balance1: address0 === alice.address ? ethers.parseEther('40') : ethers.parseEther('60'),
				nonce: 1n,
			};

			const sigC0 = await signBalance(address0 === alice.address ? alice : bob, domain, correctBalance);
			const sigC1 = await signBalance(address0 === alice.address ? bob : alice, domain, correctBalance);

			await paymentChannel.challenge(correctBalance, sigC0, sigC1);

			// Wait for maturity
			await time.increase(MIN_TIMELOCK);

			// Get balances before
			const aliceBalanceBefore = await token.balanceOf(alice.address);
			const bobBalanceBefore = await token.balanceOf(bob.address);

			// Execute settlement - Alice should lose everything
			await expect(paymentChannel.executeSettlement(channelId))
				.to.emit(paymentChannel, 'SettlementExecuted')
				.withArgs(
					channelId,
					address0 === bob.address ? totalAmount : 0n,
					address0 === alice.address ? totalAmount : 0n,
					true
				);

			// Verify Alice gets nothing, Bob gets everything
			const aliceBalanceAfter = await token.balanceOf(alice.address);
			const bobBalanceAfter = await token.balanceOf(bob.address);

			expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(0);
			expect(bobBalanceAfter - bobBalanceBefore).to.equal(totalAmount);
		});
	});

	describe('Penalty: Unnecessary Challenge (Balances Match)', function () {
		it('Should penalize challenger when settlement balances match challenge', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const totalAmount = ethers.parseEther('100');

			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				totalAmount,
				false,
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sigF0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sigF1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await paymentChannel.fund(funding, sigF0, sigF1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Alice submits honest settlement
			const honestSettlement: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettlement = await signBalance(alice, domain, honestSettlement);
			await paymentChannel.settleUnilateral(honestSettlement, sigSettlement);

			// Bob challenges with SAME balances (unnecessary challenge)
			const matchingChallenge: Balance = {
				channelId,
				balance0: ethers.parseEther('60'), // Same as settlement
				balance1: ethers.parseEther('40'), // Same as settlement
				nonce: 1n,
			};

			const sigC0 = await signBalance(address0 === alice.address ? alice : bob, domain, matchingChallenge);
			const sigC1 = await signBalance(address0 === alice.address ? bob : alice, domain, matchingChallenge);

			await paymentChannel.challenge(matchingChallenge, sigC0, sigC1);

			// Wait for maturity
			await time.increase(MIN_TIMELOCK);

			// Get balances before
			const aliceBalanceBefore = await token.balanceOf(alice.address);
			const bobBalanceBefore = await token.balanceOf(bob.address);

			// Execute settlement - Bob (challenger) should lose everything
			await expect(paymentChannel.executeSettlement(channelId))
				.to.emit(paymentChannel, 'SettlementExecuted')
				.withArgs(
					channelId,
					address0 === alice.address ? totalAmount : 0n,
					address0 === bob.address ? totalAmount : 0n,
					true
				);

			// Verify Alice (submitter) gets everything, Bob gets nothing
			const aliceBalanceAfter = await token.balanceOf(alice.address);
			const bobBalanceAfter = await token.balanceOf(bob.address);

			expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(totalAmount);
			expect(bobBalanceAfter - bobBalanceBefore).to.equal(0);
		});
	});

	describe('Multiple Challenges', function () {
		it('Should use latest challenge for penalty calculation', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const totalAmount = ethers.parseEther('100');

			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				totalAmount,
				false,
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sigF0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sigF1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await paymentChannel.fund(funding, sigF0, sigF1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Alice submits settlement
			const settlement: Balance = {
				channelId,
				balance0: ethers.parseEther('70'),
				balance1: ethers.parseEther('30'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettlement = await signBalance(alice, domain, settlement);
			await paymentChannel.settleUnilateral(settlement, sigSettlement);

			// First challenge with different balances
			const challenge1: Balance = {
				channelId,
				balance0: ethers.parseEther('50'),
				balance1: ethers.parseEther('50'),
				nonce: 1n,
			};

			const sigC1_0 = await signBalance(address0 === alice.address ? alice : bob, domain, challenge1);
			const sigC1_1 = await signBalance(address0 === alice.address ? bob : alice, domain, challenge1);

			await paymentChannel.challenge(challenge1, sigC1_0, sigC1_1);

			// Second challenge with different balances (this one should be used)
			const challenge2: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: 2n,
			};

			const sigC2_0 = await signBalance(address0 === alice.address ? alice : bob, domain, challenge2);
			const sigC2_1 = await signBalance(address0 === alice.address ? bob : alice, domain, challenge2);

			await paymentChannel.challenge(challenge2, sigC2_0, sigC2_1);

			// Wait for maturity
			await time.increase(MIN_TIMELOCK);

			// Get balances before
			const bobBalanceBefore = await token.balanceOf(bob.address);

			// Execute settlement - should use challenge2, not challenge1
			// Settlement differs from challenge2, so Alice loses all
			await paymentChannel.executeSettlement(channelId);

			// Verify Bob gets everything (since Alice was dishonest)
			const bobBalanceAfter = await token.balanceOf(bob.address);
			expect(bobBalanceAfter - bobBalanceBefore).to.equal(totalAmount);
		});
	});
});
