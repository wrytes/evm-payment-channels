# Smart Contracts

Solidity smart contracts for the EVM Payment Channels project.

## Structure

```
smart-contracts/
├── contracts/          # Solidity source files
│   ├── Factory.sol    # (To be implemented) Factory contract for deploying PaymentChannel contracts
│   └── PaymentChannel.sol  # (To be implemented) Token-specific payment channel contract
├── test/              # Contract tests
├── ignition/          # Hardhat Ignition deployment modules
├── helper/            # Helper utilities (wallet management)
├── abi/               # Generated contract ABIs (auto-generated)
├── typechain/         # TypeScript bindings (auto-generated)
└── artifacts/         # Compilation artifacts (auto-generated)
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

## Contract Development

### Contracts to Implement

Based on the specification in `/idea/Smart Contract Specification.md`:

1. **Factory.sol**

    - Deploy one PaymentChannel contract per token
    - Registry mapping: token → PaymentChannel address
    - Query function: `getPaymentChannel(address token)`

2. **PaymentChannel.sol**
    - Manages all bilateral channels for a specific token
    - Core functions:
        - `fund()`: Create/fund channels with signed authorization
        - `settle()`: Initiate cooperative or unilateral settlement
        - `challenge()`: Submit higher-nonce states during dispute
        - `executeSettlement()`: Finalize settlement after timelock
    - EIP-712 signature verification
    - Reentrancy protection
    - Channel lifecycle management

### Testing

Write comprehensive tests covering:

-   Channel creation and funding
-   Off-chain state management (signature verification)
-   Settlement flows (cooperative and unilateral)
-   Challenge period mechanics
-   Edge cases and attack vectors

## Security Considerations

-   All contracts are immutable (no upgradability)
-   Use OpenZeppelin's ReentrancyGuard
-   Follow checks-effects-interactions pattern
-   Extensive input validation
-   Protection against replay attacks
-   EIP-712 structured data signing

## Resources

-   [Hardhat Documentation](https://hardhat.org/docs)
-   [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
-   [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
