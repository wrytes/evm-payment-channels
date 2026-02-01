import { onchainTable, primaryKey } from 'ponder';

export const PaymentChannelDeployed = onchainTable(
	'PaymentChannelDeployed',
	(t) => ({
		chainId: t.integer().notNull(),
		txHash: t.hex().notNull(),
		logIndex: t.integer().notNull(),
		createdAt: t.bigint().notNull(),
		blockheight: t.bigint().notNull(),

		token: t.hex().notNull(),
		paymentChannel: t.hex().notNull(),
	}),
	(table) => ({
		pk: primaryKey({
			columns: [
				table.chainId,
				table.txHash,
				table.logIndex,
			],
		}),
	}),
);
