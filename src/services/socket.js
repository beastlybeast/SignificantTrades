import Vue from 'vue'
import Axios from 'axios'

import Kraken from '../exchanges/kraken'
import Bitmex from '../exchanges/bitmex'
import Coinex from '../exchanges/coinex'
import Huobi from '../exchanges/huobi'
import Binance from '../exchanges/binance'
import Bitfinex from '../exchanges/bitfinex'
import Bitstamp from '../exchanges/bitstamp'
import Gdax from '../exchanges/gdax'
import Hitbtc from '../exchanges/hitbtc'
import Okex from '../exchanges/okex'
import Poloniex from '../exchanges/poloniex'

import store from '../services/store'

const emitter = new Vue({
	data() {
		return {
			ids: [],
			trades: [],
			exchanges: [
				new Bitmex(),
				new Bitfinex(),
				new Coinex(),
				new Binance(),
				new Gdax(),
				new Huobi(),
				new Bitstamp(),
				new Hitbtc(),
				new Okex(),
				new Poloniex()
			],
			connected: [],
			matchs: {},
			errors: {},
			timestamps: {},
			API_URL: null,
			PROXY_URL: null,
			queue: [],
			_pair: null
		}
	},
  computed: {
    pair () {
      return store.state.pair
    },
		disabled () {
			return store.state.disabled
		},
		filters () {
			return store.state.filters
		},
		actives () {
			return store.state.actives
		}
  },
	created() {
		window.emitTrade = (exchange, price, amount, side, type = null) => {
			let trade = [exchange || 'bitmex', +new Date(), price || '1', amount || 1, side ? 1 : 0, type]

			this.emitFilteredTradesAndVolumeSum([trade]);
		}

		this.exchanges.forEach(exchange => {
			this.ids.push(exchange.id);

			exchange.on('live_trades', data => {
				if (!data || !data.length) {
					return;
				}

				this.timestamps[exchange.id] = +new Date();

				data = data
					.sort((a, b) => a[1] - b[1]);

				this.queue = this.queue.concat(data);
			});

			exchange.on('open', event => {
				console.log(`[socket.exchange.on.open] ${exchange.id} opened`);

				const index = this.connected.indexOf(exchange.id);
				index === -1 && this.connected.push(exchange.id);

				this.errors[exchange.id] = 0;

				this.$emit('connected', exchange.id);
			});

			exchange.on('close', event => {
				console.log(`[socket.exchange.on.close] ${exchange.id} closed`);

				const index = this.connected.indexOf(exchange.id);
				index >= 0 && this.connected.splice(index, 1);

				this.$emit('connected', exchange.id);

				if (exchange.shouldBeConnected && this.disabled.indexOf(exchange) === -1) {
					exchange.reconnect(this.pair);
				}
			});

			exchange.on('match', pair => {
				console.log(`[socket.exchange.on.match] ${exchange.id} matched ${pair}`);

				// this.matchs[exchange.id] = pair;
			});

			exchange.on('error', event => {
				console.log(`[socket.exchange.on.error] ${exchange.id} reported an error`);

				/* if (!this.errors[exchange.id]) {
					this.errors[exchange.id] = 0;
				}

				this.errors[exchange.id]++;

				this.$emit('exchange_error', exchange.id, this.errors[exchange.id]); */
			});

			store.commit('reloadExchangeState', exchange.id);
		})
	},
	methods: {
		initialize() {
			console.log(`[sockets] initializing ${this.exchanges.length} exchange(s)`);

			if (process.env.API_URL) {
				this.API_URL = process.env.API_URL;
				console.info(`[sockets] API_URL = ${this.API_URL}`);
			}

			if (process.env.PROXY_URL) {
				this.PROXY_URL = process.env.PROXY_URL;
				console.info(`[sockets] PROXY_URL = ${this.PROXY_URL}`);
			}

			console.log(this.exchanges);

			this.connectExchanges();

			setInterval(() => {
				if (!this.queue.length) {
					return;
				}

				this.trades = this.trades.concat(this.queue);

				this.emitFilteredTradesAndVolumeSum(this.queue);

				this.queue = [];
			}, 1000);
		},
		connectExchanges(pair = null) {
			this.disconnectExchanges();

			if (pair) {
				this.pair = pair;
			}

			this.trades = [];

			console.log(`[socket.connect] connecting to "${this.pair}"`);

			this.$emit('alert', {
				id: `server_status`,
				type: 'info',
				title: `Loading`,
				message: `Fetching products...`
			});

			Promise.all(this.exchanges.map(exchange => exchange.validatePair(this.pair))).then(() => {
				let validExchanges = this.exchanges.filter(exchange => exchange.valid);

				this.$emit('alert', {
					id: `server_status`,
					type: 'info',
					title: `Loading`,
					message: `Matching "${pair}" exchanges...`
				});

				if (!validExchanges.length) {
					return;
				}

				if (this._pair !== this.pair) {
					this.$emit('pairing', this.pair, this.canFetch());

					this._pair = this.pair;
				}

				validExchanges = validExchanges.filter(exchange => this.disabled.indexOf(exchange.id) === -1);

				console.log(`[socket.connect] ${validExchanges.length} successfully matched with "${this.pair}"`);

				if (this.canFetch()) {
					this.$emit('alert', {
						id: `server_status`,
						type: 'info',
						title: `Loading`,
						message: 'Fetch last 60s...'
					});
				}

				console.log(`[socket.connect] connect exchanges asynchronously`);

				validExchanges.forEach(exchange => exchange.connect());

				this.$emit('alert', {
					id: `server_status`,
				});
			});
		},
		disconnectExchanges() {
			console.log(`[socket.connect] disconnect exchanges asynchronously`);

			this.exchanges.forEach(exchange => exchange.disconnect());
		},
		trimTradesData(timestamp) {
			let index;

			for (index = this.trades.length - 1; index >= 0; index--) {
				if (this.trades[index][1] < timestamp) {
					break;
				}
			}

			if (index < 0) {
				return;
			}

			console.log(`[socket.trim] wipe ${index + 1} trades from memory`);

			this.trades.splice(0, ++index);

			this.$emit('trim', timestamp);
		},
		getExchangeById(id) {
			for (let exchange of this.exchanges) {
				if (exchange.id === id) {
					return exchange;
				}
			}

			return null;
		},
		emitFilteredTradesAndVolumeSum(trades) {
			let upVolume = 0;
			let downVolume = 0;

			const output = trades.filter(a => {
				if (this.actives.indexOf(a[0]) === -1) {
					return false;
				}

				if (a[4]) {
					upVolume += a[3];
				} else {
					downVolume += a[3];
				}

				return true;
			})

			this.$emit('trades', output, upVolume, downVolume);
		},
		canFetch() {
			return this.API_URL && /btcusd/i.test(this.pair);
		},
		fetchRangeIfNeeded(range, timeframe) {
			const now = +new Date();

      let promise;
			let from = now - range;
			let to = !this.trades.length ? now : this.trades[0][1];

			from = Math.floor(from / timeframe) * timeframe;
			to = Math.ceil(to / timeframe) * timeframe;

			console.log('socket->fetchRangeIfNeeded', `\n\tcurrent time: ${new Date(now)}\n\tfrom: ${new Date(from)}\n\tto: ${new Date(to)} (${this.trades.length ? 'using first trade as base' : 'using now for reference'})`);

      if (this.canFetch() && (!this.trades.length || this.trades[0][1] > from)) {
        promise = this.fetchHistoricalData(from, to, true);
      } else {
        promise = Promise.resolve(null);
      }

			return promise;
		},
		fetchHistoricalData(from, to) {
			if (!from || !to || !this.canFetch()) {
				return Promise.resolve();
			}

			const url = `${process.env.API_URL ? process.env.API_URL : ''}${parseInt(from)}/${parseInt(to)}`;

			if (this.lastFetchUrl === url) {
				return Promise.resolve();
			}

			this.lastFetchUrl = url;

			return new Promise((resolve, reject) => {
				Axios.get(url, {
					onDownloadProgress: e => this.$emit('fetchProgress', {
						loaded: e.loaded,
						total: e.total,
						progress: e.loaded / e.total
					})
				})
					.then(response => {
						let fetchedTrades = response.data;

						const count = this.trades.length;

						if (!this.trades.length) {
							console.log(`[fetch] set socket.trades (${this.trades} trades)`);

							this.trades = fetchedTrades;
						} else {
							const prepend = fetchedTrades.filter(trade => trade[1] <= this.trades[0][1]);
							const append = fetchedTrades.filter(trade => trade[1] >= this.trades[this.trades.length - 1][1]);

							if (prepend.length) {
								console.log(`[fetch] prepend ${prepend.length} trades`);
								this.trades = prepend.concat(this.trades);
							}

							if (append.length) {
								console.log(`[fetch] append ${append.length} trades`);
								this.trades = this.trades.concat(append);
							}
						}

						if (count !== this.trades.length) {
							this.$emit('historical', fetchedTrades, from, to);
						}

						resolve(fetchedTrades);
					})
					.catch(err => {
						err && this.$emit('alert', {
							type: 'error',
							title: `Unable to retrieve history`,
							message: err.response && err.response.data && err.response.data.error ? err.response.data.error : err.message,
							id: `fetch_error`
						});

						reject();
					})
			});
		}
	}
});

export default emitter;