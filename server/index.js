
const WebSocket = require('ws');
const Axios = require('axios');
const Server = require('./src/Server');

let json;

try {
	let json = require('./config');
} catch (error) {}

const config = Object.assign({
	pair: 'BTCUSD',
	port: 3000,
	delay: 200,
}, json);

const Kraken = require('./src/exchanges/Kraken');
const Bitmex = require('./src/exchanges/Bitmex');
const Gdax = require('./src/exchanges/Gdax');
const Bitfinex = require('./src/exchanges/Bitfinex');
const Okex = require('./src/exchanges/Okex');
const Bitstamp = require('./src/exchanges/Bitstamp');
const Binance = require('./src/exchanges/Binance');
const Huobi = require('./src/exchanges/Huobi');
const Hitbtc = require('./src/exchanges/Hitbtc');

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


