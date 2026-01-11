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

describe('PaymentChannel - Safe Operations', function () {
	describe('Scenario 1: Safe Channel Creation', function () {
		it('Should allow Alice to safely fund and reclaim if Bob goes offline', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const initialAmount = ethers.parseEther('100');

			// Step 1: Get both signatures for funding (Alice will fund)
			const funding = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				initialAmount,
				false, // Alice (assume address0) funds
				0n
			);

			const sigF0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sigF1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Step 2: BEFORE funding, Alice gets her own signature for claiming funds back
			const emergencyExit: Balance = {
				channelId,
				balance0: address0 === alice.address ? initialAmount : 0n,
				balance1: address0 === alice.address ? 0n : initialAmount,
				nonce: SETTLEMENT_NONCE,
			};

			const aliceEmergencySignature = await signBalance(alice, domain, emergencyExit);

			// Step 3: Alice funds the channel
			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);
			await paymentChannel.fund(funding, sigF0, sigF1);

			// Verify channel is created
			const channel = await paymentChannel.getChannel(channelId);
			expect(channel.balance).to.equal(initialAmount);

			// Step 4: Bob goes offline / unresponsive
			// Alice can propose settlement with her pre-signed emergency exit
			await paymentChannel.settleUnilateral(emergencyExit, aliceEmergencySignature);

			// Step 5: Wait for maturity (Bob doesn't challenge)
			await time.increase(MIN_TIMELOCK);

			// Step 6: Alice executes settlement and reclaims all her funds
			const aliceBalanceBefore = await token.balanceOf(alice.address);

			await paymentChannel.executeSettlement(channelId);

			const aliceBalanceAfter = await token.balanceOf(alice.address);

			// Alice got all her funds back
			expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(initialAmount);

			// Channel is closed
			expect(await paymentChannel.isClosed(channelId)).to.be.true;
		});

		it('Should prevent Alice from funding if she cannot safely exit', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const initialAmount = ethers.parseEther('100');

			// Step 1: Get both signatures for funding
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

			const sigF0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding);
			const sigF1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Step 2: Alice tries to create an emergency exit that gives her MORE than she funded
			// (This is dishonest - she funded 100 but tries to claim 150)
			const dishonestExit: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('150') : 0n,
				balance1: address0 === alice.address ? 0n : ethers.parseEther('150'),
				nonce: SETTLEMENT_NONCE,
			};

			// This signature is invalid because balance sum doesn't match channel balance

			// Step 3: Fund the channel
			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);
			await paymentChannel.fund(funding, sigF0, sigF1);

			// Step 4: Alice tries to use dishonest exit
			const aliceDishonestSignature = await signBalance(alice, domain, dishonestExit);

			// This will fail because balance sum is invalid
			await expect(
				paymentChannel.settleUnilateral(dishonestExit, aliceDishonestSignature)
			).to.be.revertedWithCustomError(paymentChannel, 'InvalidBalanceSum');
		});
	});

	describe('Scenario 2: Safe Additional Funding', function () {
		it('Should allow safe additional funding with agreed balance update', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const initialAmount = ethers.parseEther('100');

			// Step 1: Create initial channel (Alice funds 100)
			const funding0 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				initialAmount,
				false, // Alice funds
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sigF0_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding0);
			const sigF0_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding0);

			await paymentChannel.fund(funding0, sigF0_0, sigF0_1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Simulate off-chain: After some time, Alice has paid Bob 60 ETH
			// Current off-chain state: Alice: 40, Bob: 60

			// Step 2: Bob wants to add 50 more to the channel
			const additionalAmount = ethers.parseEther('50');

			// Step 2a: Get both signatures for additional funding (funding.nonce = 1)
			const funding1 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				additionalAmount,
				true, // Bob funds this time
				1n // nonce = 1
			);

			const sigF1_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding1);
			const sigF1_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding1);

			// Step 2b: ALSO get both signatures for the new balance state
			// New total = 150, with Alice: 40, Bob: 110 (Bob's 50 added to his 60)
			const newBalanceState: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('40') : ethers.parseEther('110'),
				balance1: address0 === alice.address ? ethers.parseEther('110') : ethers.parseEther('40'),
				nonce: 1n, // Off-chain state nonce
			};

			const sigBalance0 = await signBalance(address0 === alice.address ? alice : bob, domain, newBalanceState);
			const sigBalance1 = await signBalance(address0 === alice.address ? bob : alice, domain, newBalanceState);

			// Step 3: Execute the funding transaction
			await paymentChannel.fund(funding1, sigF1_0, sigF1_1);

			// Verify new balance
			const channel = await paymentChannel.getChannel(channelId);
			expect(channel.balance).to.equal(ethers.parseEther('150'));
			expect(channel.nonce).to.equal(1n);

			// Step 4: Now if Bob tries to cheat by proposing wrong settlement
			const bobCheatSettlement: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('10') : ethers.parseEther('140'),
				balance1: address0 === alice.address ? ethers.parseEther('140') : ethers.parseEther('10'),
				nonce: SETTLEMENT_NONCE,
			};

			const bobCheatSig = await signBalance(bob, domain, bobCheatSettlement);
			await paymentChannel.settleUnilateral(bobCheatSettlement, bobCheatSig);

			// Step 5: Alice challenges with the agreed balance state
			await paymentChannel.challenge(newBalanceState, sigBalance0, sigBalance1);

			// Step 6: Wait for maturity
			await time.increase(MIN_TIMELOCK);

			// Step 7: Execute settlement - Bob loses everything for cheating
			const aliceBalanceBefore = await token.balanceOf(alice.address);
			const bobBalanceBefore = await token.balanceOf(bob.address);

			await paymentChannel.executeSettlement(channelId);

			const aliceBalanceAfter = await token.balanceOf(alice.address);
			const bobBalanceAfter = await token.balanceOf(bob.address);

			// Bob cheated, Alice wins all funds
			expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(ethers.parseEther('150'));
			expect(bobBalanceAfter - bobBalanceBefore).to.equal(0n);
		});

		it('Should allow cooperative settlement after safe additional funding', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const initialAmount = ethers.parseEther('100');

			// Step 1: Create initial channel
			const funding0 = createFunding(
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

			const sigF0_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding0);
			const sigF0_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding0);

			await paymentChannel.fund(funding0, sigF0_0, sigF0_1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Step 2: Bob adds 50, both sign new state (Alice: 40, Bob: 110)
			const funding1 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('50'),
				true,
				1n
			);

			const sigF1_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding1);
			const sigF1_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding1);

			await paymentChannel.fund(funding1, sigF1_0, sigF1_1);

			// Step 3: Both parties agree to settle cooperatively
			const finalSettlement: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('40') : ethers.parseEther('110'),
				balance1: address0 === alice.address ? ethers.parseEther('110') : ethers.parseEther('40'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigSettle0 = await signBalance(address0 === alice.address ? alice : bob, domain, finalSettlement);
			const sigSettle1 = await signBalance(address0 === alice.address ? bob : alice, domain, finalSettlement);

			// Step 4: Execute cooperative settlement (instant)
			const aliceBalanceBefore = await token.balanceOf(alice.address);
			const bobBalanceBefore = await token.balanceOf(bob.address);

			await paymentChannel.settleCooperative(finalSettlement, sigSettle0, sigSettle1);

			const aliceBalanceAfter = await token.balanceOf(alice.address);
			const bobBalanceAfter = await token.balanceOf(bob.address);

			// Verify correct payouts
			const aliceExpected = ethers.parseEther('40');
			const bobExpected = ethers.parseEther('110');

			expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(aliceExpected);
			expect(bobBalanceAfter - bobBalanceBefore).to.equal(bobExpected);

			// Channel is closed
			expect(await paymentChannel.isClosed(channelId)).to.be.true;
		});

		it('Should demonstrate the danger of funding without pre-signed balance update', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const initialAmount = ethers.parseEther('100');

			// Step 1: Create initial channel (Alice: 100, Bob: 0)
			const funding0 = createFunding(
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

			const sigF0_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding0);
			const sigF0_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding0);

			await paymentChannel.fund(funding0, sigF0_0, sigF0_1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Step 2: Off-chain, they've been transacting: Alice: 30, Bob: 70

			// Step 3: Bob wants to add 50, but Alice INCORRECTLY doesn't get a balance update signature
			const funding1 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('50'),
				true, // Bob funds
				1n
			);

			const sigF1_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding1);
			const sigF1_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding1);

			// Bob funds (total now 150)
			await paymentChannel.fund(funding1, sigF1_0, sigF1_1);

			// Step 4: Alice tries to cheat by settling with old state (Alice: 100, Bob: 50)
			const aliceCheatSettlement: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('100') : ethers.parseEther('50'),
				balance1: address0 === alice.address ? ethers.parseEther('50') : ethers.parseEther('100'),
				nonce: SETTLEMENT_NONCE,
			};

			const aliceCheatSig = await signBalance(alice, domain, aliceCheatSettlement);
			await paymentChannel.settleUnilateral(aliceCheatSettlement, aliceCheatSig);

			// Step 5: Bob has NO pre-signed balance update to challenge with!
			// He only has the old state signed (Alice: 30, Bob: 70) which reflects old balance of 100
			// But he can't challenge because his signed state has balance sum = 100, not 150

			const oldState: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('30') : ethers.parseEther('70'),
				balance1: address0 === alice.address ? ethers.parseEther('70') : ethers.parseEther('30'),
				nonce: 1n,
			};

			const sigOld0 = await signBalance(address0 === alice.address ? alice : bob, domain, oldState);
			const sigOld1 = await signBalance(address0 === alice.address ? bob : alice, domain, oldState);

			// This will fail because balance sum doesn't match channel balance (100 != 150)
			await expect(paymentChannel.challenge(oldState, sigOld0, sigOld1)).to.be.revertedWithCustomError(
				paymentChannel,
				'InvalidBalanceSum'
			);

			// Step 6: Bob is stuck - he can't challenge Alice's fraudulent settlement
			// Wait for maturity
			await time.increase(MIN_TIMELOCK);

			// Step 7: Settlement executes with Alice's fraudulent balances
			const aliceBalanceBefore = await token.balanceOf(alice.address);
			const bobBalanceBefore = await token.balanceOf(bob.address);

			await paymentChannel.executeSettlement(channelId);

			const aliceBalanceAfter = await token.balanceOf(alice.address);
			const bobBalanceAfter = await token.balanceOf(bob.address);

			// Alice gets more than she deserves, Bob loses out
			const aliceReceived = aliceBalanceAfter - aliceBalanceBefore;
			const bobReceived = bobBalanceAfter - bobBalanceBefore;

			expect(aliceReceived).to.equal(ethers.parseEther('100'));
			expect(bobReceived).to.equal(ethers.parseEther('50'));

			// This demonstrates why you MUST get a balance update signature before additional funding!
		});

		it('Should allow Bob to win everything with pre-signed insurance settlement', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const initialAmount = ethers.parseEther('100');

			// Step 1: Create initial channel (Alice funds 100)
			const funding0 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				initialAmount,
				false, // Alice funds
				0n
			);

			await approveTokens(token, await paymentChannel.getAddress(), alice, bob);

			const sigF0_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding0);
			const sigF0_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding0);

			await paymentChannel.fund(funding0, sigF0_0, sigF0_1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Current off-chain state: Alice: 40, Bob: 60

			// Step 2: Bob wants to add 50 - BEST PRACTICE with insurance
			const additionalAmount = ethers.parseEther('50');

			// Step 2a: Get both signatures for additional funding
			const funding1 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				additionalAmount,
				true, // Bob funds
				1n
			);

			const sigF1_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding1);
			const sigF1_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding1);

			// Step 2b: Get both signatures for correct balance state (for challenging)
			const correctBalanceState: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('40') : ethers.parseEther('110'),
				balance1: address0 === alice.address ? ethers.parseEther('110') : ethers.parseEther('40'),
				nonce: 1n,
			};

			const sigCorrect0 = await signBalance(
				address0 === alice.address ? alice : bob,
				domain,
				correctBalanceState
			);
			const sigCorrect1 = await signBalance(
				address0 === alice.address ? bob : alice,
				domain,
				correctBalanceState
			);

			// Step 3: Bob funds the channel (now safe)
			await paymentChannel.fund(funding1, sigF1_0, sigF1_1);

			// Verify new balance
			const channel = await paymentChannel.getChannel(channelId);
			expect(channel.balance).to.equal(ethers.parseEther('150'));

			// Step 4: Alice tries to cheat with fraudulent settlement
			const aliceCheatSettlement: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('100') : ethers.parseEther('50'),
				balance1: address0 === alice.address ? ethers.parseEther('50') : ethers.parseEther('100'),
				nonce: SETTLEMENT_NONCE,
			};

			const aliceCheatSig = await signBalance(alice, domain, aliceCheatSettlement);
			await paymentChannel.settleUnilateral(aliceCheatSettlement, aliceCheatSig);

			// Step 5: Bob has TWO options to win

			// Option A: Challenge with correct state → Alice loses ALL (winner-takes-all penalty)
			await paymentChannel.challenge(correctBalanceState, sigCorrect0, sigCorrect1);

			await time.increase(MIN_TIMELOCK);

			const bobBalanceBefore = await token.balanceOf(bob.address);
			const aliceBalanceBefore = await token.balanceOf(alice.address);

			// Execute settlement - Alice cheated, Bob wins everything
			await paymentChannel.executeSettlement(channelId);

			const bobBalanceAfter = await token.balanceOf(bob.address);
			const aliceBalanceAfter = await token.balanceOf(alice.address);

			// Bob gets all 150 due to penalty (Alice cheated)
			expect(bobBalanceAfter - bobBalanceBefore).to.equal(ethers.parseEther('150'));
			expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(0n);

			// Channel is closed
			expect(await paymentChannel.isClosed(channelId)).to.be.true;
		});

		it('Should allow Bob to use insurance if Alice goes offline', async function () {
			const fixture = await deployFixture();
			const { paymentChannel, token, alice, bob, domain } = await deployPaymentChannel(fixture);

			const [address0, address1] = sortAddresses(alice.address, bob.address);
			const salt = randomSalt();
			const initialAmount = ethers.parseEther('100');

			// Step 1: Create initial channel
			const funding0 = createFunding(
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

			const sigF0_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding0);
			const sigF0_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding0);

			await paymentChannel.fund(funding0, sigF0_0, sigF0_1);

			const channelId = computeChannelId(
				domain,
				address0,
				address1,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt
			);

			// Current state: Alice: 40, Bob: 60

			// Step 2: Bob adds 50 with insurance
			const funding1 = createFunding(
				alice.address,
				bob.address,
				await token.getAddress(),
				MIN_TIMELOCK,
				salt,
				ethers.parseEther('50'),
				true,
				1n
			);

			const sigF1_0 = await signFunding(address0 === alice.address ? alice : bob, domain, funding1);
			const sigF1_1 = await signFunding(address0 === alice.address ? bob : alice, domain, funding1);

			// Bob gets insurance: Alice gets only 30, Bob gets 120
			// (Fair would be Alice: 40, Bob: 110, so Bob gets +10 as insurance premium)
			const bobInsurance: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('30') : ethers.parseEther('120'),
				balance1: address0 === alice.address ? ethers.parseEther('120') : ethers.parseEther('30'),
				nonce: 10n,
			};

			// bob has both sigs, in case he needs to challenge
			const sigInsurance0 = await signBalance(address0 === alice.address ? alice : bob, domain, bobInsurance);
			const sigInsurance1 = await signBalance(address0 === alice.address ? bob : alice, domain, bobInsurance);

			// Bob funds
			await paymentChannel.fund(funding1, sigF1_0, sigF1_1);

			// Step 3: Alice goes offline (doesn't respond)
			// Bob can use his insurance settlement to exit

			const bobRecover: Balance = {
				channelId,
				balance0: address0 === alice.address ? ethers.parseEther('30') : ethers.parseEther('120'),
				balance1: address0 === alice.address ? ethers.parseEther('120') : ethers.parseEther('30'),
				nonce: SETTLEMENT_NONCE,
			};

			const sigBobRecover = await signBalance(address0 === alice.address ? bob : alice, domain, bobRecover);

			const bobBalanceBefore = await token.balanceOf(bob.address);
			const aliceBalanceBefore = await token.balanceOf(alice.address);

			// Bob uses cooperative settlement with insurance terms
			await paymentChannel.settleUnilateral(bobRecover, sigBobRecover);
			await time.increase(MIN_TIMELOCK);
			await paymentChannel.executeSettlement(channelId);

			const bobBalanceAfter = await token.balanceOf(bob.address);
			const aliceBalanceAfter = await token.balanceOf(alice.address);

			// Bob gets 120, Alice gets 30 (per insurance agreement)
			expect(bobBalanceAfter - bobBalanceBefore).to.equal(ethers.parseEther('120'));
			expect(aliceBalanceAfter - aliceBalanceBefore).to.equal(ethers.parseEther('30'));

			// Channel is closed
			expect(await paymentChannel.isClosed(channelId)).to.be.true;
		});
	});
});
