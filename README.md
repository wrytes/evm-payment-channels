# EVM Payment Channels

A minimal, privacy-preserving payment channel system for EVM-compatible blockchains. Enable instant, unlimited off-chain transactions with optimistic settlement and strong game-theoretic security guarantees.

## Overview

This project implements a layer-2 payment channel solution similar to Bitcoin's Lightning Network, but designed specifically for Ethereum and EVM chains. Using EIP-712 signatures and optimistic settlement, parties can transact off-chain with complete privacy, settling on-chain only when needed.

## Key Features

- **Privacy-First**: Only deposits and final settlements are visible on-chain. All intermediate transactions remain private.
- **Signature-Based**: Purely cryptographic verification using EIP-712. No reliance on `msg.sender`, enabling relayer models and maximum decentralization.
- **Optimistic Settlement**: Instant finality with mutual consent, or challenge period for disputed settlements.
- **Multiple Funding Rounds**: Refuel channels multiple times and transact unlimited off-chain before settling once.
- **Immutable & Trustless**: No admin controls, no upgrades. Pure smart contract logic with strong security guarantees.
- **Winner-Takes-All Penalties**: Game-theoretic deterrent against cheating attempts.

## Getting Started

This is a monorepo managed with Yarn workspaces. To get started:

```bash
# Install all dependencies across all workspaces
yarn install

# Work with specific workspaces
yarn contracts:compile    # Compile smart contracts
yarn contracts:test       # Run contract tests
yarn backend:dev         # Start backend development server
yarn app:dev            # Start frontend development server
```

For more details, see the README in each workspace folder.

## Architecture

This is a monorepo containing three main components:

```
evm-payment-channels/
├── smart-contracts/    # Solidity contracts (Factory + PaymentChannel)
├── backend/           # Off-chain infrastructure and APIs
└── application/       # Frontend application for channel management
```

### Smart Contracts

- **Factory Contract**: Deploys one PaymentChannel contract per token type (e.g., one for USDC, one for DAI). Maintains a registry of token → contract addresses.
- **PaymentChannel Contract**: Token-specific contract that manages all bilateral channels for that token. Each channel is identified by a unique channelId derived from the funding parameters.

### How It Works

1. **Channel Creation**: Both parties sign a funding struct off-chain. Anyone submits it to the token-specific PaymentChannel contract (deployed via Factory if needed), creating a new channel identified by a unique channelId
2. **Off-Chain Transactions**: Parties exchange signed balance structs privately, updating channel state instantly
3. **Settlement**:
   - **Cooperative**: Both parties sign final state with nonce=max → instant settlement
   - **Unilateral**: One party submits settlement → challenge period begins
4. **Challenge Period**: Counterparty can submit higher-nonce states to prove fraud
5. **Final Execution**: After timelock expires, channel settles with penalties for cheaters

## Core Design Principles

- **One token per channel**: Simplified security model and isolated risk
- **Two-party channels**: Direct bilateral relationships without routing complexity
- **No partial withdrawals**: All-or-nothing settlement to preserve privacy
- **EIP-712 signatures**: Industry-standard structured data signing
- **Reentrancy protected**: Follows checks-effects-interactions pattern

## Security Features

- Channel-specific replay protection via unique channelIds
- State nonce management prevents state replay attacks
- Winner-takes-all penalty system deters fraudulent settlement attempts
- Challenge mechanism ensures honest party can always recover correct balance
- Privacy-preserving nonce strategy (settlement always uses max uint256)

## Token Support

- ERC20 tokens (standard implementation)
- Use WETH for ETH compatibility
- No support for fee-on-transfer or rebasing tokens

## Limitations & Trade-offs

- Parties must be online during challenge period to defend against fraud
- Timelock duration must balance security vs. UX (minimum 3 days recommended)
- Cannot reuse channelIds after closure
- Requires both signatures for funding (prevents channel bricking)

## Documentation

See `idea/Smart Contract Specification.md` for complete technical specification including:
- Detailed data structures
- State flow diagrams
- Security analysis
- Edge case handling

## Status

This project is currently in the specification and initial development phase.

## License

Licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.
