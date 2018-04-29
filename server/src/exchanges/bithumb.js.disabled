const Exchange = require('../exchange');
const WebSocket = require('ws');
const axios = require('axios');

class Bithumb extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'bithumb';

		this.symbols = ['BTC', 'ETH', 'DASH', 'LTC', 'ETC', 'XRP', 'BCH', 'XMR', 'ZEC', 'QTUM', 'BTG', 'EOS'];

    this.mapping = pair => {
			if (!/USD$/.test(pair)) {
				return false;
			}

			for (let symbol of this.symbols) {
				if (pair.indexOf(symbol) === 0) {
					return symbol;
				}
			}

      return false;
    }

		this.options = Object.assign({
			url: (method, commodity) => {
				return `https://api.bithumb.com/public/${method}/${commodity}`
			},
			interval: 3000
		}, this.options);
	}

	connect(pair) {
    if (!super.connect(pair))  
      return;

		this.reference = 0;

		this.schedule();

		this.emitOpen();
	}

	schedule() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(this.get.bind(this), this.options.interval);
	}

	get() {
		const token = axios.CancelToken;
		this.source = token.source();

		axios.get(this.getUrl('recent_transactions', this.pair), {
			cancelToken: this.source.token
		})
			.then(response => {		
				if (response.status !== 200 || !response.data || !response.data.data || !response.data.data.length)  {
					this.schedule();
					return;
				}
				
				if (['0000', '200'].indexOf(response.data.status.toString()) === -1) {
					throw new Error(`Invalid response status (${response.data.status})`);
				}

				this.emitData(this.format(response.data.data));

				this.schedule();
			})
			.catch(error => {
				if (axios.isCancel(error)) {
					return;
				}

				this.emitError(error);
				this.emitClose();

				return error;
			})
			.then(() => {
				delete this.source;
			})
	}

	disconnect() {
    if (!super.disconnect())  
      return;

		clearTimeout(this.timeout);
		this.source && this.source.cancel();

		this.emitClose();
	}

	format(data) {
		let output = [];
		
		if (this.reference) {
			output = data.filter(trade => trade.cont_no > this.reference).map(trade => [
				+new Date(trade.transaction_date),
				+trade.price * 0.000942,
				+trade.units_traded,
				trade.type === 'bid' ? 1 : 0
			]);
		}

		this.reference = data[0].cont_no;

		return output;
	}
}

module.exports = Bithumb;