import { onchainTable, primaryKey } from 'ponder';

export const ChannelCreated = onchainTable(
	'ChannelCreated',
	(t) => ({
		chainId: t.integer().notNull(),
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		createdAt: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),

		channelId: t.hex().notNull(),
		address0: t.hex().notNull(),
		address1: t.hex().notNull(),
		token: t.hex().notNull(),
		timelock: t.bigint().notNull(),
		salt: t.hex().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [
				table.chainId,
				table.channelId,
			],
		}),
	}),
);

export const ChannelFunded = onchainTable(
	'ChannelFunded',
	(t) => ({
		chainId: t.integer().notNull(),
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		createdAt: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),

		channelId: t.hex().notNull(),
		source: t.hex().notNull(),
		amount: t.bigint().notNull(),
		newBalance: t.bigint().notNull(),
		nonce: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [
				table.chainId,
				table.channelId,
				table.blockheight,
				table.logIndex,
			],
		}),
	}),
);

export const ChallengeSubmitted = onchainTable(
	'ChallengeSubmitted',
	(t) => ({
		chainId: t.integer().notNull(),
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		createdAt: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),

		channelId: t.hex().notNull(),
		balance0: t.bigint().notNull(),
		balance1: t.bigint().notNull(),
		nonce: t.bigint().notNull(),
		newMaturity: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [
				table.chainId,
				table.channelId,
				table.blockheight,
				table.logIndex,
			],
		}),
	}),
);

export const SettlementProposed = onchainTable(
	'SettlementProposed',
	(t) => ({
		chainId: t.integer().notNull(),
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		createdAt: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),

		channelId: t.hex().notNull(),
		submitter: t.hex().notNull(),
		balance0: t.bigint().notNull(),
		balance1: t.bigint().notNull(),
		maturity: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [
				table.chainId,
				table.channelId,
				table.blockheight,
				table.logIndex,
			],
		}),
	}),
);

export const SettlementCooperative = onchainTable(
	'SettlementCooperative',
	(t) => ({
		chainId: t.integer().notNull(),
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		createdAt: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),

		channelId: t.hex().notNull(),
		balance0: t.bigint().notNull(),
		balance1: t.bigint().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [
				table.chainId,
				table.channelId,
			],
		}),
	}),
);

export const SettlementExecuted = onchainTable(
	'SettlementExecuted',
	(t) => ({
		chainId: t.integer().notNull(),
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		createdAt: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),

		channelId: t.hex().notNull(),
		payout0: t.bigint().notNull(),
		payout1: t.bigint().notNull(),
		penaltyApplied: t.integer().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [
				table.chainId,
				table.channelId,
			],
		}),
	}),
);

export const ChannelClosed = onchainTable(
	'ChannelClosed',
	(t) => ({
		chainId: t.integer().notNull(),
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		createdAt: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),

		channelId: t.hex().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [
				table.chainId,
				table.channelId,
			],
		}),
	}),
);
