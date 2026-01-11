import { expect } from 'chai';
import { ethers } from 'hardhat';
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

describe('PaymentChannel - Settlement', function () {
	describe('Cooperative Settlement', function () {
		it('Should execute instant settlement with both signatures', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const initialAmount = ethers.parseEther('100');

			// Create and fund channel
			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				initialAmount,
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

			// Create final balance state
			const balance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigB0 = await signBalance(address0 === alice.address ? alice : bob, domain, balance);
			const sigB1 = await signBalance(address0 === alice.address ? bob : alice, domain, balance);

			// Get balances before settlement
			const aliceBalanceBefore = await token.balanceOf(alice.address);
			const bobBalanceBefore = await token.balanceOf(bob.address);

			// Execute cooperative settlement
			await expect(paymentChannel.settleCooperative(balance, sigB0, sigB1))
				.to.emit(paymentChannel, 'SettlementCooperative')
				.withArgs(channelId, balance.balance0, balance.balance1)
				.and.to.emit(paymentChannel, 'ChannelClosed')
				.withArgs(channelId);

			// Verify balances after settlement
			const aliceBalanceAfter = await token.balanceOf(alice.address);
			const bobBalanceAfter = await token.balanceOf(bob.address);

			if (address0 === alice.address) {
				expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(balance.balance0);
				expect(bobBalanceAfter - bobBalanceBefore).to.equal(balance.balance1);
			} else {
				expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(balance.balance1);
				expect(bobBalanceAfter - bobBalanceBefore).to.equal(balance.balance0);
			}

			// Verify channel is closed
			expect(await paymentChannel.isClosed(channelId)).to.be.true;
		});

		it('Should revert if nonce is not SETTLEMENT_NONCE', async function () {
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

			// Try with wrong nonce
			const balance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: 123n, // Wrong nonce!
			};

			const sigB0 = await signBalance(address0 === alice.address ? alice : bob, domain, balance);
			const sigB1 = await signBalance(address0 === alice.address ? bob : alice, domain, balance);

			await expect(paymentChannel.settleCooperative(balance, sigB0, sigB1)).to.be.revertedWithCustomError(
				paymentChannel,
				'InvalidNonce'
			);
		});

		it('Should revert if balance sum does not match channel balance', async function () {
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

			// Balance sum doesn't match
			const balance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('50'), // Total = 110, but channel has 100!
				nonce: SETTLEMENT_NONCE,
			};

			const sigB0 = await signBalance(address0 === alice.address ? alice : bob, domain, balance);
			const sigB1 = await signBalance(address0 === alice.address ? bob : alice, domain, balance);

			await expect(paymentChannel.settleCooperative(balance, sigB0, sigB1)).to.be.revertedWithCustomError(
				paymentChannel,
				'InvalidBalanceSum'
			);
		});
	});

	describe('Unilateral Settlement', function () {
		it('Should initiate settlement with one signature', async function () {
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

			const balance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE,
			};

			// Only alice signs
			const sig = await signBalance(alice, domain, balance);

			const tx = await paymentChannel.settleUnilateral(balance, sig);
			const receipt = await tx.wait();
			const block = await ethers.provider.getBlock(receipt!.blockNumber);
			const expectedMaturity = BigInt(block!.timestamp) + MIN_TIMELOCK;

			await expect(tx)
				.to.emit(paymentChannel, 'SettlementProposed')
				.withArgs(
					channelId,
					alice.address,
					balance.balance0,
					balance.balance1,
					expectedMaturity
				);

			// Verify settlement is stored
			const settlement = await paymentChannel.getSettlement(channelId);
			expect(settlement.channelId).to.equal(channelId);
			expect(settlement.balance0).to.equal(balance.balance0);
			expect(settlement.balance1).to.equal(balance.balance1);
			expect(settlement.nonce).to.equal(SETTLEMENT_NONCE);

			// Verify maturity is set
			const channel = await paymentChannel.getChannel(channelId);
			expect(channel.maturity).to.be.gt(0);
		});

		it('Should revert if settlement already pending', async function () {
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

			const balance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE,
			};

			const sig = await signBalance(alice, domain, balance);

			// First settlement
			await paymentChannel.settleUnilateral(balance, sig);

			// Try second settlement
			await expect(paymentChannel.settleUnilateral(balance, sig)).to.be.revertedWithCustomError(
				paymentChannel,
				'SettlementPending'
			);
		});

		it('Should allow cooperative settlement during pending unilateral settlement', async function () {
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

			const balance: Balance = {
				channelId,
				balance0: ethers.parseEther('60'),
				balance1: ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE,
			};

			// Start unilateral settlement
			const sigUnilateral = await signBalance(alice, domain, balance);
			await paymentChannel.settleUnilateral(balance, sigUnilateral);

			// Override with cooperative settlement
			const sigB0 = await signBalance(address0 === alice.address ? alice : bob, domain, balance);
			const sigB1 = await signBalance(address0 === alice.address ? bob : alice, domain, balance);

			await expect(paymentChannel.settleCooperative(balance, sigB0, sigB1))
				.to.emit(paymentChannel, 'SettlementCooperative')
				.and.to.emit(paymentChannel, 'ChannelClosed');

			// Verify channel is closed
			expect(await paymentChannel.isClosed(channelId)).to.be.true;
		});
	});
});
