import { expect } from 'chai';
import { ethers } from 'hardhat';
import { deployFixture } from './helpers/fixtures';
import { ZERO_ADDRESS } from './helpers/signatures';

describe('PaymentChannelFactory', function () {
	describe('Deployment', function () {
		it('Should deploy successfully', async function () {
			const { factory } = await deployFixture();
			expect(await factory.getAddress()).to.be.properAddress;
		});
	});

	describe('deployChannel', function () {
		it('Should deploy a new PaymentChannel for a token', async function () {
			const { factory, token } = await deployFixture();

			const tokenAddress = await token.getAddress();
			const tx = await factory.deployChannel(tokenAddress);
			await tx.wait();

			const paymentChannelAddress = await factory.getPaymentChannel(tokenAddress);
			expect(paymentChannelAddress).to.not.equal(ZERO_ADDRESS);
		});

		it('Should emit PaymentChannelDeployed event', async function () {
			const { factory, token } = await deployFixture();

			const tokenAddress = await token.getAddress();
			const tx = await factory.deployChannel(tokenAddress);
			const receipt = await tx.wait();
			const paymentChannelAddress = await factory.getPaymentChannel(tokenAddress);

			await expect(tx)
				.to.emit(factory, 'PaymentChannelDeployed')
				.withArgs(tokenAddress, paymentChannelAddress);
		});

		it('Should revert if channel already exists for token', async function () {
			const { factory, token } = await deployFixture();

			const tokenAddress = await token.getAddress();
			await factory.deployChannel(tokenAddress);

			await expect(factory.deployChannel(tokenAddress)).to.be.revertedWithCustomError(
				factory,
				'ChannelAlreadyExists'
			);
		});

		it('Should revert if token is zero address', async function () {
			const { factory } = await deployFixture();

			await expect(factory.deployChannel(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddress');
		});
	});

	describe('getPaymentChannel', function () {
		it('Should return zero address if channel not deployed', async function () {
			const { factory, token } = await deployFixture();

			const tokenAddress = await token.getAddress();
			expect(await factory.getPaymentChannel(tokenAddress)).to.equal(ZERO_ADDRESS);
		});

		it('Should return correct address after deployment', async function () {
			const { factory, token } = await deployFixture();

			const tokenAddress = await token.getAddress();
			await factory.deployChannel(tokenAddress);

			const paymentChannelAddress = await factory.getPaymentChannel(tokenAddress);
			expect(paymentChannelAddress).to.not.equal(ZERO_ADDRESS);
		});
	});

	describe('exists', function () {
		it('Should return false if channel not deployed', async function () {
			const { factory, token } = await deployFixture();

			const tokenAddress = await token.getAddress();
			expect(await factory.exists(tokenAddress)).to.be.false;
		});

		it('Should return true after deployment', async function () {
			const { factory, token } = await deployFixture();

			const tokenAddress = await token.getAddress();
			await factory.deployChannel(tokenAddress);

			expect(await factory.exists(tokenAddress)).to.be.true;
		});
	});
});
