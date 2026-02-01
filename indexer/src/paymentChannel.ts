import { ponder } from 'ponder:registry';
import {
	ChannelCreated,
	ChannelFunded,
	ChallengeSubmitted,
	SettlementProposed,
	SettlementCooperative,
	SettlementExecuted,
	ChannelClosed,
} from '../schema/paymentChannel';

ponder.on('PaymentChannel:ChannelCreated', async ({ event, context }) => {
	await context.db.insert(ChannelCreated).values({
		chainId: context.chain.id,
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		createdAt: BigInt(event.block.timestamp),
		blockheight: BigInt(event.block.number),

		channelId: event.args.channelId,
		address0: event.args.address0,
		address1: event.args.address1,
		token: event.args.token,
		timelock: event.args.timelock,
		salt: event.args.salt,
	});
});

ponder.on('PaymentChannel:ChannelFunded', async ({ event, context }) => {
	await context.db.insert(ChannelFunded).values({
		chainId: context.chain.id,
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		createdAt: BigInt(event.block.timestamp),
		blockheight: BigInt(event.block.number),

		channelId: event.args.channelId,
		source: event.args.source,
		amount: event.args.amount,
		newBalance: event.args.newBalance,
		nonce: event.args.nonce,
	});
});

ponder.on('PaymentChannel:ChallengeSubmitted', async ({ event, context }) => {
	await context.db.insert(ChallengeSubmitted).values({
		chainId: context.chain.id,
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		createdAt: BigInt(event.block.timestamp),
		blockheight: BigInt(event.block.number),

		channelId: event.args.channelId,
		balance0: event.args.balance0,
		balance1: event.args.balance1,
		nonce: event.args.nonce,
		newMaturity: event.args.newMaturity,
	});
});

ponder.on('PaymentChannel:SettlementProposed', async ({ event, context }) => {
	await context.db.insert(SettlementProposed).values({
		chainId: context.chain.id,
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		createdAt: BigInt(event.block.timestamp),
		blockheight: BigInt(event.block.number),

		channelId: event.args.channelId,
		submitter: event.args.submitter,
		balance0: event.args.balance0,
		balance1: event.args.balance1,
		maturity: event.args.maturity,
	});
});

ponder.on(
	'PaymentChannel:SettlementCooperative',
	async ({ event, context }) => {
		await context.db.insert(SettlementCooperative).values({
			chainId: context.chain.id,
			txHash: event.transaction.hash,
			logIndex: event.log.logIndex,
			createdAt: BigInt(event.block.timestamp),
			blockheight: BigInt(event.block.number),

			channelId: event.args.channelId,
			balance0: event.args.balance0,
			balance1: event.args.balance1,
		});
	},
);

ponder.on('PaymentChannel:SettlementExecuted', async ({ event, context }) => {
	await context.db.insert(SettlementExecuted).values({
		chainId: context.chain.id,
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		createdAt: BigInt(event.block.timestamp),
		blockheight: BigInt(event.block.number),

		channelId: event.args.channelId,
		payout0: event.args.payout0,
		payout1: event.args.payout1,
		penaltyApplied: event.args.penaltyApplied ? 1 : 0,
	});
});

ponder.on('PaymentChannel:ChannelClosed', async ({ event, context }) => {
	await context.db.insert(ChannelClosed).values({
		chainId: context.chain.id,
		txHash: event.transaction.hash,
		logIndex: event.log.logIndex,
		createdAt: BigInt(event.block.timestamp),
		blockheight: BigInt(event.block.number),

		channelId: event.args.channelId,
	});
});
