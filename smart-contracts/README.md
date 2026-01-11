# Smart Contracts

Solidity smart contracts for the EVM Payment Channels project.

## Overview

This package contains a complete implementation of bilateral payment channels with EIP-712 signatures and optimistic settlement. The system consists of two main contracts:

- **PaymentChannelFactory**: Deploys one PaymentChannel contract per ERC20 token
- **PaymentChannel**: Token-specific contract managing all bilateral channels for that token

## Structure

```
smart-contracts/
├── contracts/              # Solidity source files
│   ├── PaymentChannelFactory.sol   # Factory for deploying PaymentChannel contracts
│   ├── PaymentChannel.sol          # Token-specific payment channel implementation
│   ├── interfaces/                 # Contract interfaces
│   │   ├── IPaymentChannel.sol
│   │   └── IPaymentChannelFactory.sol
│   ├── libraries/                  # Utility libraries
│   │   └── ChannelLib.sol          # Address sorting utilities
│   └── mocks/                      # Test contracts
│       └── MockERC20.sol
├── test/                   # Comprehensive test suite
│   ├── Factory.test.ts             # Factory contract tests
│   ├── scenarios/                  # Scenario-based tests
│   │   ├── funding.test.ts         # Channel creation and funding
│   │   ├── settlement.test.ts      # Settlement flows
│   │   ├── challenge.test.ts       # Challenge mechanics
│   │   ├── penalties.test.ts       # Penalty system
│   │   └── safe-operations.test.ts # Real-world safety patterns
│   └── helpers/                    # Test utilities
│       ├── signatures.ts           # EIP-712 signing helpers
│       └── fixtures.ts             # Test fixtures
├── ignition/               # Hardhat Ignition deployment modules
├── helper/                 # Helper utilities (wallet management)
├── abi/                    # Generated contract ABIs (auto-generated)
├── typechain/              # TypeScript bindings (auto-generated)
└── artifacts/              # Compilation artifacts (auto-generated)
```

## Setup

1. Install dependencies:

```bash
yarn install
```

2. Configure environment:

```bash
cp .env.example .env
```

Edit `.env` and add:

-   `DEPLOYER_SEED`: Your mnemonic phrase (12-24 words)
-   `DEPLOYER_SEED_INDEX`: Derivation index (default: 1)
-   `ALCHEMY_RPC_KEY`: Alchemy API key for RPC access
-   `ETHERSCAN_API`: Etherscan API key for contract verification

## Available Scripts

### Development

```bash
# Compile contracts
yarn compile

# Run tests
yarn test

# Run test coverage
yarn coverage

# Check wallet info from seed
yarn wallet:info
```

### Deployment

```bash
# Deploy using Hardhat Ignition
yarn deploy -- --network <network-name>

# Example: Deploy to Sepolia testnet
yarn deploy -- --network sepolia
```

### Verification

```bash
# Verify contract on Etherscan
yarn verify -- --network <network-name> <contract-address> <constructor-args>
```

## Supported Networks

The hardhat configuration includes support for:

-   **Testnets**: Sepolia
-   **Mainnets**: Ethereum, Polygon, Optimism, Arbitrum, Base, Avalanche

Configure network-specific settings in `hardhat.config.ts`.

## Implementation Status

✅ **Complete** - All contracts implemented and tested

### Test Results

```
40 passing tests across all scenarios:
- Factory tests (9): Deployment, channel creation, registry queries
- Funding tests (8): Channel creation, validation, multiple channels
- Settlement tests (6): Cooperative and unilateral settlement
- Challenge tests (5): Challenge submission, nonce validation
- Penalty tests (5): Winner-takes-all penalty system
- Safe Operations tests (7): Real-world safety patterns and best practices
```

### Gas Costs

Average gas consumption per operation:

| Operation                | Gas Cost      | % of Block Limit |
| ------------------------ | ------------- | ---------------- |
| Factory Deployment       | ~2.2M gas     | 3.6%             |
| Channel Deployment       | ~1.7M gas     | 2.8%             |
| Initial Channel Funding  | ~206k gas     | 0.34%            |
| Cooperative Settlement   | ~123k gas     | 0.21%            |
| Unilateral Settlement    | ~178k gas     | 0.30%            |
| Challenge Submission     | ~130k gas     | 0.22%            |
| Execute Settlement       | ~119k gas     | 0.20%            |

## Contract Architecture

### PaymentChannelFactory

Permissionless factory that deploys one PaymentChannel contract per ERC20 token.

**Key Functions:**

-   `deployChannel(address token)`: Deploy a new PaymentChannel for a token
-   `getPaymentChannel(address token)`: Query deployed PaymentChannel address
-   `exists(address token)`: Check if PaymentChannel exists for token

### PaymentChannel

Token-specific contract managing all bilateral channels for that token. Each channel is identified by a unique `channelId` derived from the channel parameters.

**Key Functions:**

-   `fund(Funding, sig0, sig1)`: Create or add funds to a channel (requires both signatures)
-   `settleCooperative(Balance, sig0, sig1)`: Instant settlement with mutual agreement
-   `settleUnilateral(Balance, sig)`: Initiate disputed settlement with challenge period
-   `challenge(Balance, sig0, sig1)`: Submit higher-nonce state during dispute
-   `executeSettlement(channelId)`: Finalize settlement after maturity

**Core Features:**

-   EIP-712 structured data signing for all operations
-   Optimistic settlement: instant with cooperation, challenge period for disputes
-   Winner-takes-all penalty mechanism for dishonest parties
-   Multiple channels per party pair via unique salt values
-   Reentrancy protection on all state-changing functions

### Data Structures

**Funding** (for channel creation and additional funding):

```solidity
struct Funding {
    address address0;      // Lower address (sorted)
    address address1;      // Higher address (sorted)
    address token;         // ERC20 token address
    uint256 timelock;      // Challenge period duration
    bytes32 salt;          // Unique identifier for multiple channels
    uint256 amount;        // Amount to deposit
    bool source;           // false=address0 funds, true=address1 funds
    uint256 nonce;         // Funding round (0 for creation, >0 for additional funding)
}
```

**Balance** (for off-chain state updates and settlement):

```solidity
struct Balance {
    bytes32 channelId;     // Unique channel identifier
    uint256 balance0;      // address0's balance
    uint256 balance1;      // address1's balance
    uint256 nonce;         // State nonce (type(uint256).max for settlement)
}
```

**Channel** (on-chain state):

```solidity
struct Channel {
    address address0;      // Lower address (sorted)
    address address1;      // Higher address (sorted)
    uint256 timelock;      // Challenge period duration
    bytes32 salt;          // Unique identifier
    uint256 balance;       // Total deposited funds
    uint256 nonce;         // Current funding round
    bool submitter;        // false=address0, true=address1 initiated settlement
    uint256 maturity;      // Settlement execution timestamp (0=none pending)
}
```

### Nonce Behavior

The nonce system has two distinct uses:

**1. Funding Nonces (channel.nonce)**

-   **Creation**: `funding.nonce = 0` → `channel.nonce = 0`
-   **Additional Funding**: `funding.nonce` must be > `channel.nonce`, then `channel.nonce = funding.nonce`
-   Each funding signature specifies the exact resulting nonce
-   Provides explicit control and prevents replay attacks

**2. State Nonces (balance.nonce)**

-   **Off-chain updates**: Any value < `type(uint256).max`
-   **Settlement**: Always `type(uint256).max` (SETTLEMENT_NONCE constant)
-   **Challenge**: Must be > previous challenge nonce and < SETTLEMENT_NONCE
-   Enables optimistic settlement with dispute resolution

### Settlement Flows

**Cooperative Settlement** (Instant):

1. Both parties sign final Balance with `nonce = type(uint256).max`
2. Call `settleCooperative()` with both signatures
3. Immediate payout, channel closed

**Unilateral Settlement** (Challenge Period):

1. One party calls `settleUnilateral()` with their signature
2. Challenge period begins (maturity = block.timestamp + timelock)
3. Other party can `challenge()` with both signatures and higher-nonce state
4. After maturity, anyone calls `executeSettlement()`
5. Penalty logic applied if challenge exists

**Penalty Logic (Winner-Takes-All)**:

-   **No challenge**: Use settlement balances (normal payout)
-   **Challenge with different balances**: Submitter cheated → Challenger wins all funds
-   **Challenge with matching balances**: Unnecessary challenge → Submitter wins all funds

## Safe Operation Patterns

### Scenario 1: Safe Channel Creation

**Problem**: When Alice funds a channel, Bob could go offline, leaving Alice's funds locked.

**Solution**: Before executing the funding transaction, Alice should:

1. Get both signatures for the funding transaction
2. Get her own signature on a settlement balance that returns her funds
3. Execute the funding transaction
4. If Bob goes offline, Alice can unilaterally settle and reclaim her funds after the timelock

**Code Example**:

```typescript
// Step 1: Get both signatures for funding
const funding = { ...channelParams, amount: 100 };
const sig0 = await signFunding(address0Signer, domain, funding);
const sig1 = await signFunding(address1Signer, domain, funding);

// Step 2: Alice pre-signs emergency exit (before funding!)
const emergencyExit = {
	channelId,
	balance0: aliceIsAddress0 ? 100 : 0,
	balance1: aliceIsAddress0 ? 0 : 100,
	nonce: SETTLEMENT_NONCE,
};
const aliceEmergencySignature = await signBalance(alice, domain, emergencyExit);

// Step 3: Now Alice safely funds the channel
await paymentChannel.fund(funding, sig0, sig1);

// Step 4: If Bob goes offline, Alice can exit
await paymentChannel.settleUnilateral(emergencyExit, aliceEmergencySignature);
// Wait for maturity, then execute
```

### Scenario 2: Safe Additional Funding

**Problem**: When adding funds to an existing channel, if you don't update the balance state simultaneously, the other party could propose an old (more favorable) state.

**Solution**: When adding additional funding:

1. Get both signatures for the additional funding transaction
2. **ALSO** get both signatures for a new balance state reflecting the new total
3. Execute the funding transaction
4. Now both parties can safely challenge any dishonest settlement with the pre-signed balance

**Code Example**:

```typescript
// Current state: Alice: 40, Bob: 60, Total: 100
// Bob wants to add 50

// Step 1: Get signatures for additional funding
const additionalFunding = {
	...channelParams,
	amount: 50,
	source: true, // Bob funds
	nonce: 1, // Next funding round
};
const sigF0 = await signFunding(address0Signer, domain, additionalFunding);
const sigF1 = await signFunding(address1Signer, domain, additionalFunding);

// Step 2: Get BOTH signatures for new balance state (CRITICAL!)
const newBalanceState = {
	channelId,
	balance0: aliceIsAddress0 ? 40 : 110, // Alice: 40, Bob: 60 + 50 = 110
	balance1: aliceIsAddress0 ? 110 : 40,
	nonce: 1, // Off-chain state nonce
};
const sigB0 = await signBalance(address0Signer, domain, newBalanceState);
const sigB1 = await signBalance(address1Signer, domain, newBalanceState);

// Step 3: Execute funding
await paymentChannel.fund(additionalFunding, sigF0, sigF1);

// Step 4: If Alice tries to cheat with old state, Bob can challenge
// Bob has both signatures to challenge with the correct 150 total state
```

**Why This Matters**:

-   Without the pre-signed balance update, Bob cannot challenge Alice's fraudulent settlement
-   His old signed states have `balance0 + balance1 = 100`, but channel now has 150
-   The contract rejects challenges with invalid balance sums
-   Alice can successfully steal Bob's additional 50 tokens

### Scenario 3: Optimal Additional Funding with Insurance (BEST PRACTICE)

**Problem**: Even with a balance update signature, if the other party cheats, you only get the fair split via challenge. You want maximum protection.

**Solution**: When adding additional funding, get THREE signatures:

1. Both signatures for the additional funding transaction
2. Both signatures for the correct balance state (for challenging)
3. **Both signatures for an "insurance settlement" that gives you a favorable split**

This provides the funder with optimal protection:

-   **If counterparty cheats**: Challenge with correct state → Win ALL funds via penalty
-   **If counterparty goes offline**: Use insurance settlement for instant exit with bonus
-   **If all goes well**: Continue with normal operations

**Code Example**:

```typescript
// Current state: Alice: 40, Bob: 60, Total: 100
// Bob wants to add 50

// Step 1: Get funding signatures
const funding = { ...params, amount: 50, source: true, nonce: 1 };
const sigF0 = await signFunding(address0Signer, domain, funding);
const sigF1 = await signFunding(address1Signer, domain, funding);

// Step 2: Get signatures for CORRECT balance state (for challenging cheaters)
const correctState = {
	channelId,
	balance0: aliceIsAddress0 ? 40 : 110, // Fair: Alice: 40, Bob: 110
	balance1: aliceIsAddress0 ? 110 : 40,
	nonce: 1,
};
const sigCorrect0 = await signBalance(address0Signer, domain, correctState);
const sigCorrect1 = await signBalance(address1Signer, domain, correctState);

// Step 3: Get signatures for INSURANCE settlement (favorable to Bob)
const insuranceSettlement = {
	channelId,
	balance0: aliceIsAddress0 ? 30 : 120, // Insurance: Alice: 30, Bob: 120
	balance1: aliceIsAddress0 ? 120 : 30, // Bob gets +10 bonus as insurance premium
	nonce: SETTLEMENT_NONCE,
};
const sigInsurance0 = await signBalance(address0Signer, domain, insuranceSettlement);
const sigInsurance1 = await signBalance(address1Signer, domain, insuranceSettlement);

// Step 4: Bob funds (total now 150)
await paymentChannel.fund(funding, sigF0, sigF1);

// Now Bob has TWO protection mechanisms:

// Protection A: If Alice cheats, Bob challenges and wins ALL (150)
// Alice proposes: Alice: 100, Bob: 50 (dishonest)
// Bob challenges with correctState: Alice: 40, Bob: 110
// Result: Balances differ → Alice loses everything → Bob gets 150

// Protection B: If Alice goes offline, Bob uses insurance settlement
// Bob calls settleCooperative(insuranceSettlement, sigInsurance0, sigInsurance1)
// Result: Instant exit with Bob: 120, Alice: 30 (Bob gets his +10 bonus)
```

**Why This is Optimal**:

-   **Maximum Security**: The funder is protected in all scenarios
-   **Penalty Leverage**: If cheated, win everything (not just fair share)
-   **Exit Option**: If counterparty disappears, instant exit with bonus
-   **Fair Premium**: The insurance premium (e.g., +10) compensates for capital risk

**Real-World Use Case**:

A payment processor (Bob) adding liquidity to a merchant's channel (Alice). Bob gets:

1. Protection against Alice's fraud (wins all via penalty)
2. Insurance premium for providing liquidity
3. Quick exit option if Alice's business goes offline

**Test Coverage**: See `test/scenarios/safe-operations.test.ts` for complete examples demonstrating:

-   ✅ Safe channel creation with emergency exit
-   ✅ Prevention of dishonest emergency exits
-   ✅ Safe additional funding with balance updates
-   ✅ Challenge protection with pre-signed states
-   ✅ Danger demonstration of funding without balance updates
-   ✅ Optimal protection: Challenge and win all funds via penalty
-   ✅ Insurance settlement: Instant exit with bonus if counterparty offline

## Security Considerations

-   ✅ All contracts are immutable (no upgradability)
-   ✅ ReentrancyGuard on all external state-changing functions
-   ✅ EIP-712 domain separation prevents cross-chain/contract replay
-   ✅ Nonce systems prevent transaction replay within channels
-   ✅ Address sorting enforced to prevent signature confusion
-   ✅ Both signatures required for funding (prevents channel bricking)
-   ✅ Comprehensive input validation on all functions
-   ✅ SafeERC20 for token transfers

## Development Workflow

### Running Tests

```bash
# Run all tests
yarn test

# Run specific test file
yarn test test/scenarios/funding.test.ts

# Run tests matching pattern
yarn test --grep "cooperative"

# Generate coverage report
yarn coverage
```

### Test Coverage

The test suite covers:

-   ✅ Channel creation and funding validation
-   ✅ Address sorting and token validation
-   ✅ Cooperative settlement (instant finalization)
-   ✅ Unilateral settlement (challenge period)
-   ✅ Challenge mechanics (nonce ordering, maturity reset)
-   ✅ Penalty system (dishonest submitter, unnecessary challenge)
-   ✅ Edge cases (early execution, invalid nonces, closed channels)
-   ✅ Multiple channels between same parties (salt-based)
-   ✅ Safe operation patterns (emergency exits, funding security)
-   ✅ Attack scenarios (funding without balance updates)

## Deployment Guide

### Local Deployment

```bash
# Start local Hardhat node
npx hardhat node

# Deploy to local network (in another terminal)
yarn deploy -- --network localhost
```

### Testnet Deployment

```bash
# Deploy to Sepolia
yarn deploy -- --network sepolia

# Verify contract on Etherscan
yarn verify -- --network sepolia <FACTORY_ADDRESS>
```

### Production Deployment

1. Review security considerations
2. Ensure .env has production keys
3. Deploy to mainnet: `yarn deploy -- --network mainnet`
4. Verify contracts on Etherscan
5. Document deployed addresses below

### Deployed Contracts

| Network  | PaymentChannelFactory | Block   | Transaction |
| -------- | --------------------- | ------- | ----------- |
| Sepolia  | TBD                   | TBD     | TBD         |
| Mainnet  | TBD                   | TBD     | TBD         |

## Resources

-   [Hardhat Documentation](https://hardhat.org/docs)
-   [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
-   [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
-   [Project Specification](../idea/Smart%20Contract%20Specification.md)
