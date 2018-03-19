
const WebSocket = require('ws');
const Axios = require('axios');
const Server = require('./src/Server');

const config = Object.assign({
	pair: 'BTCUSD'
}, require('./config'));

const Kraken = require('./src/exchanges/Kraken');
const Bitmex = require('./src/exchanges/Bitmex');
const Gdax = require('./src/exchanges/Gdax');
const Bitfinex = require('./src/exchanges/Bitfinex');
const Okex = require('./src/exchanges/Okex');
const Bitstamp = require('./src/exchanges/Bitstamp');
const Binance = require('./src/exchanges/Binance');

new Server({
	port: 3000,
	pair: config.pair,
	exchanges: [
		new Kraken({
			key: config.exchanges.kraken.key,
			secret: config.exchanges.kraken.secret
		}),
		//new Bitmex(),
		/*new Okex({
			key: config.exchanges.okex.key,
			secret: config.exchanges.okex.secret,
		}),*/
		new Gdax(),
		new Bitstamp(),
		new Bitfinex(),
		new Binance(),
		new Okex(),
	]
});