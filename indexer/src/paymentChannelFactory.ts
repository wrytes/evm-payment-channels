import { ponder } from 'ponder:registry';
import { PaymentChannelDeployed } from '../schema/paymentChannelFactory';

ponder.on(
	'PaymentChannelFactory:PaymentChannelDeployed',
	async ({ event, context }) => {
		await context.db.insert(PaymentChannelDeployed).values({
			chainId: context.chain.id,
			txHash: event.transaction.hash,
			logIndex: event.log.logIndex,
			createdAt: BigInt(event.block.timestamp),
			blockheight: BigInt(event.block.number),

			token: event.args.token,
			paymentChannel: event.args.paymentChannel,
		});
	},
);
