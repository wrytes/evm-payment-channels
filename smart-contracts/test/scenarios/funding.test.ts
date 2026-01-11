import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployFixture, deployPaymentChannel, approveTokens } from '../helpers/fixtures';
import {
	createFunding,
	signFunding,
	sortAddresses,
	randomSalt,
	computeChannelId,
	MIN_TIMELOCK,
} from '../helpers/signatures';

describe('PaymentChannel - Funding', function () {
	describe('Channel Creation', function () {
		it('Should create a new channel with initial funding', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const amount = ethers.parseEther('10');

			// Create funding struct
			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				amount,
				false, // address0 funds
				0n // initial funding
			);

			// Approve tokens
			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			// Sign funding
			const sig0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sig1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			// Fund channel
			await expect(paymentChannel.fund(funding, sig0, sig1))
				.to.emit(paymentChannel, 'ChannelCreated')
				.and.to.emit(paymentChannel, 'ChannelFunded');

			// Verify channel state
			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);
			const channel = await paymentChannel.getChannel(channelId);

			expect(channel.address0).to.equal(address0);
			expect(channel.address1).to.equal(address1);
			expect(channel.balance).to.equal(amount);
			expect(channel.nonce).to.equal(0n);
			expect(channel.timelock).to.equal(MIN_TIMELOCK);
		});

		it('Should revert if addresses are not sorted', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();

			// Create funding with WRONG order (address1 first)
			const funding = {
				address0: address1, // Wrong!
				address1: address0, // Wrong!
				token: await token.getAddress(),
				timelock: MIN_TIMELOCK,
				salt,
				amount: ethers.parseEther('10'),
				source: false,
				nonce: 0n,
			};

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sig0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sig1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await expect(paymentChannel.fund(funding, sig0, sig1)).to.be.revertedWithCustomError(
				paymentChannel,
				'RequireSorted'
			);
		});

		it('Should revert if timelock is below minimum', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const salt = randomSalt();
			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK - 1n, // Below minimum!
				salt,
				ethers.parseEther('10'),
				false,
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const [address0] = sortAddresses(alice.address, bob.address);
			const sig0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sig1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await expect(paymentChannel.fund(funding, sig0, sig1)).to.be.revertedWithCustomError(
				paymentChannel,
				'InvalidTimelock'
			);
		});

		it('Should revert if amount is zero', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const salt = randomSalt();
			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				0n, // Zero amount!
				false,
				0n
			);

			const [address0] = sortAddresses(alice.address, bob.address);
			const sig0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sig1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await expect(paymentChannel.fund(funding, sig0, sig1)).to.be.revertedWithCustomError(
				paymentChannel,
				'InvalidAmount'
			);
		});

		it('Should revert if token does not match', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, alice, bob, domain } = await deployPaymentChannel(fixture);

			// Deploy another token
			const TokenFactory = await ethers.getContractFactory('MockERC20');
			const wrongToken = await TokenFactory.deploy('Wrong Token', 'WRONG', 18);

			const salt = randomSalt();
			const funding = createFunding(
				alice.address,
				bob.address,
				await wrongToken.getAddress(), // Wrong token!
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('10'),
				false,
				0n
			);

			const [address0] = sortAddresses(alice.address, bob.address);
			const sig0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sig1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			await expect(paymentChannel.fund(funding, sig0, sig1)).to.be.revertedWithCustomError(
				paymentChannel,
				'InvalidToken'
			);
		});
	});

	describe('Additional Funding', function () {
		it('Should add funds to existing channel', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();

			// Initial funding
			const funding0 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('10'),
				false,
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sig0_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding0);
			const sig1_0 = await signFunding(address0 === alice.address ? bob : alice, domain, funding0);

			await paymentChannel.fund(funding0, sig0_0, sig1_0);

			// Additional funding
			const funding1 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('5'),
				true, // address1 funds this time
				1n // nonce > channel.nonce (which is 0)
			);

			const sig0_1 = await signFunding(address0 === alice.address ? alice : bob, domain, funding1);
			const sig1_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding1);

			await expect(paymentChannel.fund(funding1, sig0_1, sig1_1)).to.emit(paymentChannel, 'ChannelFunded');

			// Verify total balance
			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);
			const channel = await paymentChannel.getChannel(channelId);

			expect(channel.balance).to.equal(ethers.parseEther('15'));
			expect(channel.nonce).to.equal(1n); // nonce set to 1
		});

		it('Should revert if nonce is not greater than channel nonce', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();

			// Initial funding
			const funding0 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('10'),
				false,
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sig0_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding0);
			const sig1_0 = await signFunding(address0 === alice.address ? bob : alice, domain, funding0);

			await paymentChannel.fund(funding0, sig0_0, sig1_0);

			// ---

			// Additional funding
			const funding1 = await createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('5'),
				true, // address1 funds this time
				1n // nonce > channel.nonce (which is 0)
			);

			const sig0_1 = await signFunding(address0 === alice.address ? alice : bob, domain, funding1);
			const sig1_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding1);

			await paymentChannel.fund(funding1, sig0_1, sig1_1);

			// Try to fund with same nonce
			const funding2 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('5'),
				false,
				1n // Same as channel.nonce!
			);

			const sig0_2 = await signFunding(address0 === alice.address ? alice : bob, domain, funding2);
			const sig1_2 = await signFunding(address0 === alice.address ? bob : alice, domain, funding2);

			await expect(paymentChannel.fund(funding2, sig0_2, sig1_2)).to.be.revertedWithCustomError(
				paymentChannel,
				'InvalidNonce'
			);
		});
	});

	describe('Multiple Channels', function () {
		it('Should allow same parties to create multiple channels with different salts', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			// Create first channel
			const salt1 = randomSalt();
			const funding1 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt1,
				ethers.parseEther('10'),
				false,
				0n
			);

			const sig0_1 = await signFunding(address0 === alice.address ? alice : bob, domain, funding1);
			const sig1_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding1);

			await paymentChannel.fund(funding1, sig0_1, sig1_1);

			// Create second channel with different salt
			const salt2 = randomSalt();
			const funding2 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt2,
				ethers.parseEther('20'),
				true,
				0n
			);

			const sig0_2 = await signFunding(address0 === alice.address ? alice : bob, domain, funding2);
			const sig1_2 = await signFunding(address0 === alice.address ? bob : alice, domain, funding2);

			await paymentChannel.fund(funding2, sig0_2, sig1_2);

			// Verify both channels exist
			const channelId1 = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt1
			);
			const channelId2 = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt2
			);

			const channel1 = await paymentChannel.getChannel(channelId1);
			const channel2 = await paymentChannel.getChannel(channelId2);

			expect(channel1.balance).to.equal(ethers.parseEther('10'));
			expect(channel2.balance).to.equal(ethers.parseEther('20'));
			expect(channelId1).to.not.equal(channelId2);
		});
	});
});
