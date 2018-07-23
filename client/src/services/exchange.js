import EventEmitter from '../helpers/eventemitter'
import Axios from 'axios';

class Exchange extends EventEmitter {

	constructor(options) {
		super();

		this.id = this.constructor.name.toLowerCase();
		console.info('new exchange', this.id);

		this.connected = false;
		this.valid = false;
		this.shouldBeConnected = false;
		this.reconnectionDelay = 5000;

		this.options = Object.assign({
			// default exchanges options
		}, options || {});

		try {
			const storage = JSON.parse(localStorage.getItem(this.id));

			if (storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24) {
				console.info(`[${this.id}] reading stored products`);

				if (Array.isArray(storage.data)) {
					this.pairs = storage.data;
				} else {
					this.mapping = storage.data;
				}
			} else {
				console.info(`[${this.id}] products data expired`);
			}
		} catch (error) {
			console.error(`[${this.id}] unable to retrieve stored products`, error);
		}
	}

	get hasProducts() {
		return !(((!this.pairs || !Array.isArray(this.pairs))) && (!this.mapping || typeof this.mapping !== 'object'));
	}

	set pair(name) {
		if (this.mapping) {
			if (typeof this.mapping === 'function') {
				this._pair = this.mapping(name);
			} else {
				this._pair = this.mapping[name];
			}
		} else if (this.pairs && this.pairs.indexOf(name)) {
			this._pair = name;
		} else {
			this._pair = null;
		}
	}

	get pair() {
		return this._pair;
	}

	connect(reconnection = false) {
		if (this.connected) {
			this.disconnect();
		}

		if (this.valid) {
			console.log(`[${this.id}] ${reconnection ? 're' : ''}connecting... (${this.pair})`);

			this.shouldBeConnected = true;

			return true;
		}
	}

	disconnect() {
		clearTimeout(this.reconnectionTimeout);

		this.shouldBeConnected = false;

		return true;
	}

	reconnect() {
		clearTimeout(this.reconnectionTimeout);

		if (this.connected) {
			return;
		}

		console.log(`[${this.id}] schedule reconnection (${this.reconnectionDelay} ms)`);

		this.reconnectionTimeout = setTimeout(() => {
			if (!this.connected) {
				this.connect(true);
			}
		}, this.reconnectionDelay);

		this.reconnectionDelay *= 2;
	}

	emitOpen(event) {
		console.log(`[${this.id}] connected`);

		this.connected = true;

		this.reconnectionDelay = 5000;

		this.emit('open', event);
	}

	emitTrades(data) {
		if (!data || !data.length) {
			return;
		}

		const group = {};
		const now = +new Date();

		for (let trade of data) {
			const id = parseInt(trade[1]).toFixed() + '_' + trade[4]; // timestamp + side

			if (group[id] && !group[id][5]) {
				group[id][2].push(trade[2]);
				group[id][3].push(trade[3]);
			} else {
				trade[1] = Math.min(now + 1000, trade[1]);
				trade[2] = [trade[2]];
				trade[3] = [trade[3]];
				group[id] = trade;
			}
		}

		this.emit('live_trades', Object.keys(group).map(id => {
			const stacked = group[id][3].map(a => a);

			group[id][2] = (group[id][2].map((price, index) => price * group[id][3][index]).reduce((a, b) => a + b) / group[id][2].length) / (group[id][3].reduce((a, b) => a + b) / group[id][3].length);
			group[id][3] = group[id][3].reduce((a, b) => a + b);

			const firstDigitIndex = group[id][3].toFixed(8).match(/[1-9]/);

			group[id][2] = this.toFixed(group[id][2], 10);
			group[id][3] = this.toFixed(group[id][3], 10);

			return group[id];
		}));
	}

	toFixed(number, precision) {
		var factor = Math.pow(10, precision);
		return Math.ceil(number * factor) / factor;
	}

	emitError(error) {
		console.error(`[${this.id}] error`, error.message || '');

		this.emit('error');
	}

	emitClose(event) {
		console.log(`[${this.id}] closed`);

		this.connected = false;

		this.emit('close', event);
	}

	getUrl() {
		return typeof this.options.url === 'function' ? this.options.url.apply(this, arguments) : this.options.url;
	}

	formatLiveTrades(data) {
		return data;
	}

	formatRecentsTrades(data) {
		return data;
	}

	formatProducts(data) {
		return data;
	}

	validatePair(pair) {
		this.valid = false;

		if (!this.hasProducts) {
			return this.fetchProducts()
				.then(data => this.validatePair(pair))
		}

		if (pair && (!(this.pair = pair) || !this.pair)) {
			console.log(`[${this.id}] unknown pair ${pair}`);

			this.emit('error', new Error(`Unknown pair ${pair}`));

			return Promise.resolve();
		}

		this.valid = true;

		return Promise.resolve();
	}

	fetchRecentsTrades() {
		console.log(`[${this.id}] fetching recents trades...`)

		if (!this.recents) {
			return Promise.resolve();
		}

		return new Promise((resolve, reject) => {
			fetch(`${process.env.PROXY_URL ? process.env.PROXY_URL : ''}${typeof this.recents === 'function' ? this.recents(this.pair) : this.recents}`)
				.then(response => response.json())
				.then(data => {
					console.log(`[${this.id}] received API recents trades => format trades`);

					const formated = this.formatRecentsTrades(data);

					if (!formated || !formated.length) {
						return resolve();
					}

					return resolve(formated);
				})
				.catch(error => {
					console.error(`[${this.id}] unable to fetch products`, error);

					resolve();
				})
		});
	}

	fetchProducts() {
		console.log(`[${this.id}] fetching products...`)

		return new Promise((resolve, reject) => {
			fetch(`${process.env.PROXY_URL ? process.env.PROXY_URL : ''}${typeof this.products === 'function' ? this.products(this.pair) : this.products}`)
				.then(response => response.json())
				.then(data => {
					console.log(`[${this.id}] received API products response => format products`);

					const formated = this.formatProducts(data);

					if (!formated) {
						return resolve();
					}

					if (Array.isArray(formated)) {
						this.pairs = formated;
					} else {
						this.mapping = formated;
					}

					console.log(`[${this.id}] storing products`, formated);

					localStorage.setItem(this.id, JSON.stringify({
						timestamp: +new Date(),
						data: formated
					}));

					resolve(formated);
				})
				.catch(error => {
					console.error(`[${this.id}] unable to fetch products`, error);

					this.pairs = [];

					resolve();
				});
		});
	}

}

export default Exchange;