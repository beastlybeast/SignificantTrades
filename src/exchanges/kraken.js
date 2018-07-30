import Exchange from '../services/exchange'
import axios from 'axios'

class Kraken extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'kraken';
		
    this.endpoints = {
      PRODUCTS: 'https://api.kraken.com/0/public/AssetPairs',
			TRADES: () => `https://api.kraken.com/0/public/Trades?pair=${this.pair}`
    }

		this.options = Object.assign({
			url: 'https://api.kraken.com/0/public/Trades',
			interval: 3000
		}, this.options);
	}

	connect() {
    if (!super.connect())  
      return;

		this.schedule();
	}

	schedule() {
		clearTimeout(this.timeout);
		this.timeout = setTimeout(this.get.bind(this), this.options.interval);
	}

	get() {
		const token = axios.CancelToken;
		this.source = token.source();

		const params = {
			pair: this.pair
		}

		if (this.reference) {
			params.since = this.reference;
		}

		axios.get(`http://176.31.163.155:1337/cors/${this.getUrl()}`, {
			params: params,
			cancelToken: this.source.token
		})
			.then(response => {
				if (!this.connected) {
					this.emitOpen();
				}

				if (!response.data || (response.data.error && response.data.error.length)) {
					throw new Error(response.data.error.join("\n"));
				}

				this.emitTrades(this.formatLiveTrades(response.data));

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
    if (!this.connected || !super.disconnect())  
      return;

		clearTimeout(this.timeout);
		this.source && this.source.cancel();

		delete this.reference;

		this.emitClose();
	}

	formatLiveTrades(response) {
		const initial = typeof this.reference === 'undefined';

		if (response.result && response.result[this.pair]) {
			if (response.result.last) {
				this.reference = response.result.last;
			}

			if (!initial) {
				const output = [];
				for (let trade of response.result[this.pair]) {

					output.push([
						this.id,
						trade[2] * 1000, // timestamp
						+trade[0], // price
						+trade[1], // volume
						trade[3] === 'b' ? 1 : 0, // is buy
					]);
				}

				return output;
			}
		}
	}

	/* formatRecentsTrades(response) {
		if (response && response.result && response.result && response.result[this.pair] && response.result[this.pair].length) {
			return response.result[this.pair].map(trade => [
				this.id,
				trade[2] * 1000,
				+trade[0],
				+trade[1],
				trade[3] === 'b' ? 1 : 0,
			])
		}
	} */

	formatProducts(data) {
		const output = {};

		Object.keys(data.result).forEach(a => {
			if (a.indexOf('.') !== -1) {
				return;
			}

			let base = data.result[a].base;
			let quote = data.result[a].quote;

			if (base.length > 3 && (base[0] === 'Z' || base[0] === 'X')) {
					base = base.substr(1);
			}

			if (quote.length > 3 && (quote[0] === 'Z' || quote[0] === 'X')) {
					quote = quote.substr(1);
			}

			output[(base + quote).replace('XBT', 'BTC')] = a;
		})

		return output;
	}

}

export default Kraken;