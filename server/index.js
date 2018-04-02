
const WebSocket = require('ws');
const Axios = require('axios');
const Server = require('./src/server');

let json;

try {
	json = require('./config');
} catch (error) {}

const config = Object.assign({
	pair: 'BTCUSD',
	port: 3000,
	delay: 200,
}, json || {});

const Kraken = require('./src/exchanges/kraken');
const Bitmex = require('./src/exchanges/bitmex');
const Gdax = require('./src/exchanges/gdax');
const Bitfinex = require('./src/exchanges/bitfinex');
const Okex = require('./src/exchanges/okex');
const Bitstamp = require('./src/exchanges/bitstamp');
const Binance = require('./src/exchanges/binance');
const Huobi = require('./src/exchanges/huobi');
const Hitbtc = require('./src/exchanges/hitbtc');

new Server({
	port: config.port,
	delay: config.delay,
	pair: config.pair,
	exchanges: [
		new Bitstamp(),
		new Kraken(),
		new Huobi(),
		new Hitbtc(),
		new Okex(),
		new Bitmex(),
		new Binance(),
		new Bitfinex(),
		new Gdax()
	]
});


