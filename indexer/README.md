# Payment Channels Indexer

Event indexer for EVM Payment Channels built with [Ponder](https://ponder.sh).

## Overview

This indexer tracks all on-chain events from the payment channel system, including:

- **PaymentChannelFactory**: Channel deployment events
- **PaymentChannel**: Channel lifecycle events (creation, funding, challenges, settlements, closure)

## Events Indexed

### Factory Events
- `PaymentChannelDeployed`: Tracks when new payment channel contracts are deployed for specific tokens

### Channel Events
- `ChannelCreated`: New payment channel opened between two parties
- `ChannelFunded`: Channel receives funding from participants
- `ChallengeSubmitted`: Challenge submitted during dispute resolution
- `SettlementProposed`: Unilateral settlement proposal initiated
- `SettlementCooperative`: Cooperative settlement executed by both parties
- `SettlementExecuted`: Final settlement execution after challenge period
- `ChannelClosed`: Channel permanently closed

## Setup

### Prerequisites

- Node.js >= 18.0.0
- Yarn >= 1.22.0
- PostgreSQL database (for production)

### Environment Variables

Create a `.env` file in the indexer directory:

```bash
# RPC Configuration
ALCHEMY_RPC_KEY=your_alchemy_api_key

# Optional: Performance tuning
MAX_REQUESTS_PER_SECOND=50
POLLING_INTERVAL_MS=5000

# Database (production)
DATABASE_URL=postgresql://user:password@localhost:5432/payment_channels
```

### Configuration

Before running the indexer, update `ponder.config.ts`:

1. Set contract deployment addresses
2. Set start blocks for indexing
3. Configure RPC endpoints for your target chains

Look for TODO comments in the config file.

## Development

```bash
# Install dependencies
yarn install

# Run indexer with UI
yarn dev:ui

# Run indexer without UI (headless)
yarn dev

# Type checking
yarn typecheck

# Lint code
yarn lint
```

## Production

```bash
# Start indexer
yarn start

# Database management
yarn db
```

## Database Schema

The indexer creates tables for each event type with the following common fields:

- `chainId`: Network identifier
- `txHash`: Transaction hash
- `logIndex`: Event log index
- `createdAt`: Block timestamp
- `blockheight`: Block number
- Event-specific fields (addresses, amounts, etc.)

## API

Ponder provides a GraphQL API for querying indexed data. When running with UI (`yarn dev:ui`), access the GraphQL playground at `http://localhost:42069/graphql`.

Example query:

```graphql
query {
  channelCreateds(limit: 10, orderBy: "createdAt", orderDirection: "desc") {
    items {
      channelId
      address0
      address1
      token
      timelock
      createdAt
    }
  }
}
```

## Project Structure

```
indexer/
├── schema/                   # Database schemas
│   ├── paymentChannelFactory.ts
│   └── paymentChannel.ts
├── src/                      # Event handlers
│   ├── paymentChannelFactory.ts
│   └── paymentChannel.ts
├── ponder.config.ts          # Ponder configuration
└── ponder.schema.ts          # Schema exports
```

## Resources

- [Ponder Documentation](https://ponder.sh)
- [Payment Channels Documentation](../README.md)
- [Smart Contracts](../smart-contracts)

## License

GPL-3.0
