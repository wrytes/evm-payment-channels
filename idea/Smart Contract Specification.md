# EVM Payment Channel System - Smart Contract Specification

## Core Concept

Off-chain payment channel with optimistic settlement using EIP-712 signatures. Purely signature-based (no msg.sender dependencies), enabling relayer models and maximum decentralization.

## Design Principles

-   **PaymentChannel Factory:** individual payment channel contracts, one per token
-   **Privacy-first:** Only deposits and final settlement visible on-chain
-   **Signature-based:** No reliance on msg.sender, anyone can submit signed messages
-   **Multiple-funding channels:** Refuel, transact off-chain unlimited times, settle once
-   **Optimistic settlement:** Instant with mutual consent, challenge period if disputed
-   **Immutable & trustless:** No admin controls, no upgrades

# Factory Contract Summary

## Purpose

Deploy and track individual payment channel contracts, one per token.

## Core Function

```
deployChannel(address token) returns (address paymentChannel)
- Checks if contract already exists for token
- If not: deploys new paymentChannel contract with token in constructor
- Stores in registry
- Returns contract address
```

## Storage

```
mapping(address token => address paymentChannel) registry
```

## Query Function

```
getPaymentChannel(address token) returns (address)
- Returns deployed contract address for token
- Returns address(0) if not yet deployed
```

## Properties

-   Immutable (no admin functions)
-   Anyone can deploy for any token
-   One contract per token (prevents duplicate deployments)
-   Each PaymentChannel contract is isolated and token-specific

## Usage

Users call factory to get/deploy the contract for their desired token, then interact with that specific PaymentChannel contract for all channels using that token.

# Data Structures of PaymentChannel

### Channel Struct (On-chain Metadata)

```
{
  address0,          // Lower address (sorted)
  address1,          // Higher address (sorted)
  token,             // ERC20 token (immutable, use WETH not ETH)
  balance,           // Total on-chain deposits
  nonce,             // Replay protection for deposits
  timelock,          // Challenge period duration
  submitter          // Which address started the Unilateral settlement? false(0) or true(1)
  maturity           // Timestamp when settlement executes (0 = no active settlement)
}
```

### Funding Struct (Deposit Authorization)

```
{
  address0,          // Lower address (sorted)
  address1,          // Higher address (sorted)
  token,             // Must match channel.token (or used to create channel) -- no replay attacks
  amount,            // Amount to deposit (added to balance)
  source,            // false(0) = address0, true(1) = address1
  nonce              // Funding replay protection (must be larger as channel.nonce or zero for channel creation)
}
+ signature0
+ signature1

channelId is EIP-712 hash of funding parameters
```

### Balance Struct (Off-chain State, reused for Settlement/Challenge)

```
{
  channelId,
  balance0,          // address0's balance
  balance1,          // address1's balance
  nonce              // State nonce (max for settlement, sequential for challenges)
}
+ signature0
+ signature1

nonce needs to be increased, gaps allowed
nonce uint256 max reserved for privacy on-chain settlement proposal (on-sided or cooperative, dependent on sigs)
```

## Contract Storage

### Constructor

-   Token address immutable
-   ChannelClosed

### Constants

-   min. timelock e.g. 3days

### Mappings

```
mapping(bytes32 => bool) closed                 // Channel closed
mapping(bytes32 => ChannelStruct) channels      // Channel metadata
mapping(bytes32 => BalanceStruct) settlements   // Settlement proposal
mapping(bytes32 => BalanceStruct) challenges    // Latest challenge state
```

## State Flows

### 1. Channel Creation & Funding

**Initial Deposit:**

-   Both parties sign Funding struct off-chain with `nonce = 0`
-   Anyone submits `fund(FundingStruct, sig0, sig1)`
-   Create the hash out of the struct data which becomes the channelId
-   Contract creates `channels[channelId]` if doesn't exist
-   Validates: both signatures, token match, amount > 0
-   Executes: `safeTransferFrom(source_address, token, amount)`
-   Updates: `channels[channelId].balance += amount`
-   Increments: `channels[channelId].nonce++`

**Additional Deposits:**

-   Both parties sign new Funding struct with incremented nonce
-   Both sign corresponding Balance struct (off-chain) with new totals
-   Anyone calls `fund(FundingStruct, sig0, sig1)`
-   Balance struct becomes valid only after on-chain balance matches
-   **Critical:** Funding requires both sigs to prevent channel bricking

**Invariant:** `balance0 + balance1 == channels[channelId].balance` (for valid states of new Balance structs)

### 2. Off-chain Payments

-   Parties exchange signed Balance structs
-   Nonces must strictly increase (gaps allowed)
-   Each new state supersedes previous states
-   All states remain private until settlement/challenge

### 3. Settlement Initiation

**Cooperative (2 signatures, nonce = max):**

-   Anyone submits `settle(BalanceStruct, sig0, sig1)`
-   Validates: both signatures, nonce = max, balances sum to channel.balance
-   Executes: immediate payout, channel closed, channel maturity is block timestamp
-   No challenge period

**Unilateral (1 signature, nonce = max):**

-   Anyone submits `settle(BalanceStruct, sig)`
-   Validates: one signature, from who?, nonce = max, balances sum to channel.balance
-   Stores in `settlements[channelId]`
-   Sets `channels[channelId].maturity = block.timestamp + timelock`
-   Sets `channels[channelId].submitter = by recovered sig. matched address
-   Starts challenge period

### 4. Challenge Period

**Submitting Challenge:**

-   Anyone submits `challenge(BalanceStruct, sig0, sig1)`
-   Validates:
    -   Both signatures required
    -   `nonce < max` (not a settlement)
    -   `nonce > challenges[channelId].nonce` (strictly increasing)
    -   `balance0 + balance1 == channels[channelId].balance`
-   Updates `challenges[channelId]` with new state
-   Resets `channels[channelId].maturity = block.timestamp + timelock`

**Challenge Rules:**

-   Each valid challenge resets the timelock
-   Challenges compete only with other challenges (by nonce)
-   Settlement nonce (max) is never compared to challenge nonces
-   Unlimited challenges allowed during period

### 5. Final Settlement (After Maturity)

**Execution:**

-   Anyone calls `executeSettlement(channelId)`
-   Validates: `block.timestamp >= channels[channelId].maturity`
-   Determines final state: use `challenges[channelId]` if exists, else `settlements[channelId]`
-   If challenged, we know if the "Submitter" was honest

**Penalty Logic (Winner Takes All):**

**IF** `challenges[channelId]` exists:

-   Compare `settlements[channelId].balance0/1` vs `challenges[channelId].balance0/1`
-   **Balances match:** Initial submitter was honest
    -   Counterparty loses everything (channel balance → submitter)
-   **Balances differ:** Initial submitter cheated
    -   Submitter loses everything (channel balance → counterparty)

**Payout:**

-   Transfer final balances to address0 and address1

**Close**

-   `closed[channelId] = true` (channelId cannot be reused, permanently)
-   Delete `channels[channelId]`, `settlements[channelId]`, `challenges[channelId]`

## Security Features

### Signature Verification

-   EIP-712 structured data hashing
-   Recover signer from signature, verify matches address0/address1
-   No msg.sender checks anywhere

### Replay Protection

-   ChannelId = hash of funding struct (address0, address1, token, nonce, ...)
-   One-time channel use (deleted after settlement, marked as closed)
-   Funding nonce prevents deposit replays
-   State nonces prevent state replays

### Reentrancy Protection

-   Checks-effects-interactions pattern
-   Use OpenZeppelin's ReentrancyGuard or equivalent
-   closed channelId modifier

### Privacy Preservation

-   Settlement nonce always = max (doesn't reveal actual state count)
-   Challenge nonces only visible during disputes
-   Channel metadata minimal (no balance splits visible)

## Edge Cases & Protections

### Channel Bricking Prevention

-   Funding requires both signatures
-   Prevents malicious/accidental deposits that mismatch signed states
-   If wrong amount deposited, no valid state exists → channel bricked

### Front-running Protection

-   Signature-based means no msg.sender to front-run
-   Anyone can submit, order doesn't matter (highest nonce wins)

### Griefing Mitigation

-   Penalty mechanism discourages false settlements
-   Challenge resets extend timeline but don't prevent settlement
-   Winner-takes-all ensures strong deterrent

## Privacy Guarantees

**On-chain visible:**

-   Channel exists (channelId)
-   Token type
-   Total deposits
-   Final withdrawal amounts (only after settlement)

**Off-chain private:**

-   All intermediate balance states
-   Number of transactions
-   Payment patterns
-   State nonces (unless challenged)

## Limitations & Trade-offs

### Scope

-   Single token per channel and smart contract
-   Two-party only (no multi-party channels)
-   Complex routing needs to be done off-chain
-   Funding round, both sigs required
-   No partial withdrawals (all-or-nothing settlement)

### Token Restrictions

-   No fee-on-transfer tokens
-   No rebasing tokens
-   Use WETH instead of native ETH

### Trust Assumptions

-   Parties must be online to challenge false settlements
-   Timelock must be long enough for honest party to respond
-   EIP-712 implementation security
-   Storage backup needs to be trusted and maintained

## Summary

A minimal, privacy-preserving payment channel for EVM chains that requires no trusted intermediaries, supports unlimited off-chain transactions, and settles optimistically with strong game-theoretic guarantees against cheating.
