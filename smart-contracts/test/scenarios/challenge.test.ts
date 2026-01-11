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

describe('PaymentChannel - Challenge', function () {
	describe('Challenge Period', function () {
		it('Should submit challenge with higher nonce', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();

			// Fund channel
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

			// Start unilateral settlement
			const settlementBalance: Balance = {
				channelId,
				balance0: ethers.parseEther('70'), // Fraudulent claim
				balance1: ethers.parseEther('30'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettlement = await signBalance(alice, domain, settlementBalance);
			await paymentChannel.settleUnilateral(settlementBalance, sigSettlement);

			// Submit challenge with correct balances
			const challengeBalance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'), // Correct split
				balance1: ethers.parseEther('40'),
				nonce: 1n, // Higher than 0, lower than max
			};

			const sigC0 = await signBalance(address0 === alice.address ? alice : bob, domain, challengeBalance);
			const sigC1 = await signBalance(address0 === alice.address ? bob : alice, domain, challengeBalance);

			const tx = await paymentChannel.challenge(challengeBalance, sigC0, sigC1);
			const receipt = await tx.wait();
			const block = await ethers.provider.getBlock(receipt!.blockNumber);
			const expectedMaturity = BigInt(block!.timestamp) + MIN_TIMELOCK;

			await expect(tx)
				.to.emit(paymentChannel, 'ChallengeSubmitted')
				.withArgs(channelId, challengeBalance.balance0, challengeBalance.balance1, challengeBalance.nonce, expectedMaturity);

			// Verify challenge is stored
			const challenge = await paymentChannel.getChallenge(channelId);
			expect(challenge.balance0).to.equal(challengeBalance.balance0);
			expect(challenge.balance1).to.equal(challengeBalance.balance1);
			expect(challenge.nonce).to.equal(challengeBalance.nonce);
		});

		it('Should reset maturity with each challenge', async function () {
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
				balance0: ethers.parseEther('50'),
				balance1: ethers.parseEther('50'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettlement = await signBalance(alice, domain, settlementBalance);
			await paymentChannel.settleUnilateral(settlementBalance, sigSettlement);

			const channelAfterSettlement = await paymentChannel.getChannel(channelId);
			const maturity1 = channelAfterSettlement.maturity;

			// Wait some time
			await time.increase(3600); // 1 hour

			// Submit first challenge
			const challenge1: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: 1n,
			};

			const sigC1_0 = await signBalance(address0 === alice.address ? alice : bob, domain, challenge1);
			const sigC1_1 = await signBalance(address0 === alice.address ? bob : alice, domain, challenge1);

			await paymentChannel.challenge(challenge1, sigC1_0, sigC1_1);

			const channelAfterChallenge1 = await paymentChannel.getChannel(channelId);
			const maturity2 = channelAfterChallenge1.maturity;

			// Maturity should have been reset
			expect(maturity2).to.be.gt(maturity1);

			// Wait again
			await time.increase(3600);

			// Submit second challenge with higher nonce
			const challenge2: Balance = {
				channelId,
				balance0: ethers.parseEther('55'),
				balance1: ethers.parseEther('45'),
				nonce: 2n,
			};

			const sigC2_0 = await signBalance(address0 === alice.address ? alice : bob, domain, challenge2);
			const sigC2_1 = await signBalance(address0 === alice.address ? bob : alice, domain, challenge2);

			await paymentChannel.challenge(challenge2, sigC2_0, sigC2_1);

			const channelAfterChallenge2 = await paymentChannel.getChannel(channelId);
			const maturity3 = channelAfterChallenge2.maturity;

			// Maturity should have been reset again
			expect(maturity3).to.be.gt(maturity2);
		});

		it('Should revert if nonce is not strictly increasing', async function () {
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
				balance0: ethers.parseEther('50'),
				balance1: ethers.parseEther('50'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettlement = await signBalance(alice, domain, settlementBalance);
			await paymentChannel.settleUnilateral(settlementBalance, sigSettlement);

			// First challenge
			const challenge1: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: 5n,
			};

			const sigC1_0 = await signBalance(address0 === alice.address ? alice : bob, domain, challenge1);
			const sigC1_1 = await signBalance(address0 === alice.address ? bob : alice, domain, challenge1);

			await paymentChannel.challenge(challenge1, sigC1_0, sigC1_1);

			// Try to challenge with same or lower nonce
			const challenge2: Balance = {
				channelId,
				balance0: ethers.parseEther('55'),
				balance1: ethers.parseEther('45'),
				nonce: 5n, // Same nonce!
			};

			const sigC2_0 = await signBalance(address0 === alice.address ? alice : bob, domain, challenge2);
			const sigC2_1 = await signBalance(address0 === alice.address ? bob : alice, domain, challenge2);

			await expect(paymentChannel.challenge(challenge2, sigC2_0, sigC2_1)).to.be.revertedWithCustomError(
				paymentChannel,
				'ChallengeNonceTooLow'
			);
		});

		it('Should revert if no settlement pending', async function () {
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

			// Try to challenge without settlement
			const challengeBalance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: 1n,
			};

			const sigC0 = await signBalance(address0 === alice.address ? alice : bob, domain, challengeBalance);
			const sigC1 = await signBalance(address0 === alice.address ? bob : alice, domain, challengeBalance);

			await expect(paymentChannel.challenge(challengeBalance, sigC0, sigC1)).to.be.revertedWithCustomError(
				paymentChannel,
				'NoSettlementPending'
			);
		});

		it('Should revert if challenge nonce >= SETTLEMENT_NONCE', async function () {
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
				balance0: ethers.parseEther('50'),
				balance1: ethers.parseEther('50'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettlement = await signBalance(alice, domain, settlementBalance);
			await paymentChannel.settleUnilateral(settlementBalance, sigSettlement);

			// Try to challenge with SETTLEMENT_NONCE
			const challengeBalance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE, // Invalid!
			};

			const sigC0 = await signBalance(address0 === alice.address ? alice : bob, domain, challengeBalance);
			const sigC1 = await signBalance(address0 === alice.address ? bob : alice, domain, challengeBalance);

			await expect(paymentChannel.challenge(challengeBalance, sigC0, sigC1)).to.be.revertedWithCustomError(
				paymentChannel,
				'InvalidNonce'
			);
		});
	});
});
