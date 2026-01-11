import { ethers } from 'hardhat';
import { PaymentChannelFactory, PaymentChannel, MockERC20 } from '../../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { getDomain, EIP712Domain } from './signatures';

export interface TestFixture {
	factory: PaymentChannelFactory;
	token: MockERC20;
	alice: SignerWithAddress;
	bob: SignerWithAddress;
	charlie: SignerWithAddress;
	deployer: SignerWithAddress;
}

export interface ChannelFixture extends TestFixture {
	paymentChannel: PaymentChannel;
	domain: EIP712Domain;
	chainId: bigint;
}

/**
 * Deploy all contracts and return test fixture
 */
export async function deployFixture(): Promise<TestFixture> {
	const [deployer, alice, bob, charlie] = await ethers.getSigners();

	// Deploy Factory
	const FactoryFactory = await ethers.getContractFactory('PaymentChannelFactory');
	const factory = await FactoryFactory.deploy();
	await factory.waitForDeployment();

	// Deploy Mock Token
	const TokenFactory = await ethers.getContractFactory('MockERC20');
	const token = await TokenFactory.deploy('Test Token', 'TEST', 18);
	await token.waitForDeployment();

	// Mint tokens to alice and bob
	await token.mint(alice.address, ethers.parseEther('1000'));
	await token.mint(bob.address, ethers.parseEther('1000'));

	return {
		factory,
		token,
		alice,
		bob,
		charlie,
		deployer,
	};
}

/**
 * Deploy PaymentChannel for a token
 */
export async function deployPaymentChannel(
	fixture: TestFixture
): Promise<ChannelFixture> {
	const { factory, token, alice, bob, charlie, deployer } = fixture;

	// Deploy PaymentChannel via factory
	const tx = await factory.deployChannel(await token.getAddress());
	await tx.wait();

	const paymentChannelAddress = await factory.getPaymentChannel(await token.getAddress());
	const paymentChannel = await ethers.getContractAt('PaymentChannel', paymentChannelAddress);

	// Get chainId and create domain
	const chainId = (await ethers.provider.getNetwork()).chainId;
	const domain = getDomain(paymentChannelAddress, chainId);

	return {
		...fixture,
		paymentChannel,
		domain,
		chainId,
	};
}

/**
 * Approve token spending for both parties
 */
export async function approveTokens(
	token: MockERC20,
	spender: string,
	alice: SignerWithAddress,
	bob: SignerWithAddress,
	amount: bigint = ethers.MaxUint256
): Promise<void> {
	await token.connect(alice).approve(spender, amount);
	await token.connect(bob).approve(spender, amount);
}
