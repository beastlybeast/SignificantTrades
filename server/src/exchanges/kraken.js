const Exchange = require('../Exchange');
const WebSocket = require('ws');
const axios = require('axios');
const qs = require('qs');
const crypto = require('crypto');

class Kraken extends Exchange {

	constructor(options) {
		super(options);

		this.id = 'kraken';

		this.options = Object.assign({
			url: 'https://api.kraken.com/0/public/Trades',
			pair: 'XXBTZUSD',
			interval: 3000
		}, this.options);
	}

	connect() {
		console.log('[kraken] connecting');
		
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

		const params = {
			pair: this.options.pair
		}

		if (this.last) {
			params.since = this.last;
		}
		
		const headers = {
			'API-Key': this.options.key,
			'API-Sign': this.getSignature(this.getUrl(), params)
		}

		axios.get(this.getUrl(), {
			headers: headers,
			params: params,
			cancelToken: this.source.token
		})
			.then(response => {
				if (!response.data || (response.data.error && response.data.error.length)) {
					throw new Error(response.data.error.join("\n"));
				}

				this.emitData(this.format(response.data));

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
		clearTimeout(this.timeout);
		this.source && this.source.cancel();
		
		this.emitClose();
	}

	format(response) {
		if (response.result && response.result[this.options.pair]) {
			const output = [];

			for (let trade of response.result[this.options.pair]) {
				output.push([
					String(trade[2]).replace(/\D/, '') + trade[3] + trade[4], // id
					trade[2], // timestamp
					trade[0], // price
					trade[1], // volume
					trade[3] === 'b' ? 1 : 0, // is buy
					trade[4] === 'l' ? 1 : 0, // is limit
				]);
			}
		
			if (response.result.last) {
				this.last = response.result.last;
			}

			return output;
		}
	}

	getSignature(path, params) {
		const message = qs.stringify(params);
		const secret_buffer = new Buffer(this.options.secret, 'base64');
		const hash = new crypto.createHash('sha256');
		const hmac = new crypto.createHmac('sha512', secret_buffer);
		const hash_digest = hash.update((new Date() * 1000) + message).digest('binary');
		const hmac_digest = hmac.update(path + hash_digest, 'binary').digest('base64');

		return hmac_digest;
	}

}

module.exports = Kraken;