import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

const EPHEMERAL_PROPERTIES = [
	'isSnaped',
	'isLoading',
	'isReplaying',
	'actives'
];

let QUERY_STRING;

try {
	QUERY_STRING = JSON.parse('{"' + decodeURI(location.search.substring(1))
	.replace(/"/g, '\\"')
	.replace(/&/g, '","')
	.replace(/=/g,'":"') + '"}');
} catch (error) {
	QUERY_STRING = {};
}

const subdomain = window.location.hostname.match(/^([\d\w]+)\..*\./i);

if (subdomain && subdomain.length >= 2) {
	QUERY_STRING.pair = subdomain[1].toUpperCase();
}

for (let name in QUERY_STRING) {
	try {
		QUERY_STRING[name] = JSON.parse(QUERY_STRING[name]);
	} catch (error) {}
}

const defaults = {
	pair: 'BTCUSD',
	thresholds: [
		{amount: 100000, gif: null},
		{amount: 100000, gif: null},
		{amount: 1000000, gif: 'cash'},
		{amount: 10000000, gif: 'explosion'},
	],
	exchanges: {
		bithumb: {disabled: true},
		hitbtc: {disabled: true},
		coinex: {ohlc: false},
		gdax: {threshold: .50},
		bitfinex: {threshold: .75},
		binance: {threshold: .75},
		huobi: {ohlc: false, threshold: .66},
		okex: {ohlc: false, threshold: .80},
		liquid: {disabled: true},
	},
	maxRows: 20,
	decimalPrecision: null,
	showCounters: true,
	counterPrecision: 1000 * 10,
	countersSteps: [1000 * 60, 1000 * 60 * 5, 1000 * 60 * 15, 1000 * 60 * 30, 1000 * 60 * 60, 1000 * 60 * 60 * 2, 1000 * 60 * 60 * 4],
	hideIncompleteCounter: true,
	cumulativeCounters: true,
	showStats: true,
	showChart: true,
	statsPeriod: 1000 * 60,
	chartPadding: .075,
	timeframe: 1000 * 10,
	autoClearTrades: true,
	debug: false,
	dark: true,
	useShades: true,
	useAudio: false,
	audioIncludeInsignificants: true,
	audioVolume: 1.5,
	settings: [],
	chartLiquidations: true,
	chartHeight: null,
	chartRange: 0,
	chartCandleWidth: 10,
	chartCandlestick: true,
	chartVolumeAverage: true,
	chartVolumeAverageLength: 14,
	chartAutoScale: true,

	// runtime state
	isSnaped: true,
	isLoading: false,
	isReplaying: false,
	actives: []
}

const store = new Vuex.Store({
	state: Object.assign({}, defaults, JSON.parse(localStorage.getItem('settings')) || {}, QUERY_STRING),
	mutations: {
		setPair(state, value) {
			state.pair = value.toString().toUpperCase();
		},
		setMaxRows(state, value) {
			state.maxRows = value;
		},
		setDecimalPrecision(state, value) {
			state.decimalPrecision = value;
		},
		setCounterPrecision(state, payload) {
			state.counterPrecision = value;
		},
		toggleCounters(state, value) {
			state.showCounters = value ? true : false;
		},
		toggleChart(state, value) {
			state.showChart = value ? true : false;
		},
		toggleStats(state, value) {
			state.showStats = value ? true : false;
		},
		setStatsPeriod(state, value) {
			let period;

      if (/[\d.]+s/.test(value)) {
        period = parseFloat(value) * 1000;
      } else if (/[\d.]+h/.test(value)) {
        period = parseFloat(value) * 1000 * 60 * 60;
      } else {
        period = parseFloat(value) * 1000 * 60;
      }

			state.statsPeriod = period;
		},
		toggleHideIncompleteCounter(state, value) {
			state.hideIncompleteCounter = value ? true : false;
		},
		toggleCumulativeCounters(state, value) {
			state.cumulativeCounters = value ? true : false;
		},
		setCounterStep(state, payload) {
			const step = state.countersSteps[payload.index];

			if (payload.value) {
				Vue.set(state.countersSteps, payload.index, payload.value);
			} else {
				state.countersSteps.splice(payload.index, 1);
			}

			state.countersSteps = state.countersSteps.sort((a, b) => a - b);
		},
		replaceCounterSteps(state, counters) {
			state.countersSteps = counters.sort((a, b) => a - b);
		},
		setThresholdAmount(state, payload) {
			const threshold = state.thresholds[payload.index];

			if (threshold) {
				Vue.set(state.thresholds, payload.index, {
					amount: payload.value,
					gif: threshold.gif
				});
			}
		},
		setThresholdGif(state, payload) {
			const threshold = state.thresholds[payload.index];

			if (threshold) {
				Vue.set(state.thresholds, payload.index, {
					amount: threshold.amount,
					gif: payload.value
				});
			}
		},
		enableExchange(state, exchange) {
			Vue.set(state.exchanges[exchange], 'disabled', false);
		},
		disableExchange(state, exchange) {
			Vue.set(state.exchanges[exchange], 'disabled', true);
		},
		showExchange(state, exchange) {
			Vue.set(state.exchanges[exchange], 'hidden', false);
		},
		hideExchange(state, exchange) {
			Vue.set(state.exchanges[exchange], 'hidden', true);
		},
		toggleExchangeVisibility(state, exchange) {
			Vue.set(state.exchanges[exchange], 'hidden', state.exchanges[exchange].hidden === true ? false : true);
		},
		toggleSettingsPanel(state, value) {
      const index = state.settings.indexOf(value);

      if (index === -1) {
        state.settings.push(value);
      } else {
        state.settings.splice(index, 1);
      }
		},
		toggleAudio(state, value) {
			state.useAudio = value ? true : false;
		},
		toggleAudioIncludeInsignificants(state, value) {
			state.audioIncludeInsignificants = value ? true : false;
		},
		toggleDark(state, value) {
			state.dark = value ? true : false;
		},
		setAudioVolume(state, value) {
			state.audioVolume = value;
		},
		setTimeframe(state, value) {
			state.timeframe = value;
		},
		toggleLiquidations(state, value) {
			state.chartLiquidations = value ? true : false;
		},
		toggleCandlestick(state, value) {
			state.chartCandlestick = value ? true : false;
		},
		toggleVolumeAverage(state, value) {
			state.chartVolumeAverage = value ? true : false;
		},
		setVolumeAverageLength(state, value) {
			state.chartVolumeAverageLength = parseInt(value) || 14;
		},
		toggleAutoClearTrades(state, value) {
			state.autoClearTrades = value ? true : false;
		},
		setExchangeThreshold(state, payload) {
			Vue.set(state.exchanges[payload.exchange], 'threshold', +payload.threshold);
		},
		setExchangeMatch(state, payload) {
			Vue.set(state.exchanges[payload.exchange], 'match', payload.match);
		},
		toggleExchangeOHLC(state, exchange) {
			Vue.set(state.exchanges[exchange], 'ohlc', state.exchanges[exchange].ohlc === false ? true : false);
		},
		setChartHeight(state, value) {
			state.chartHeight = value || null;
		},
		setChartRange(state, value) {
			state.chartRange = value;
		},
		setChartCandleWidth(state, value) {
			state.chartCandleWidth = value;
		},
		setChartPadding(state, value) {
			state.chartPadding = value;
		},
		toggleChartAutoScale(state, value) {
			state.chartAutoScale = value ? true : false;
		},

		// runtime commit
		toggleSnap(state, value) {
			state.isSnaped = value ? true : false;
		},
		toggleLoading(state, value) {
			state.isLoading = value ? true : false;
		},
		toggleReplaying(state, params) {
			state.isReplaying = params ? true : false;
		},
		reloadExchangeState(state, exchange) {
			if (!exchange) {
				return;
			}

			if (typeof exchange === 'object' && exchange.exchange) {
				exchange = exchange.exchange;
			} else if (typeof exchange !== 'string') {
				return;
			}

			if (!state.exchanges[exchange]) {
				Vue.set(state.exchanges, exchange, {});
			}

      const index = state.actives.indexOf(exchange);
      const active = state.exchanges[exchange].match && !state.exchanges[exchange].disabled && !state.exchanges[exchange].hidden;

      if (active && index === -1) {
        state.actives.push(exchange);
      } else if (!active && index >= 0) {
        state.actives.splice(index, 1);
      }
		}
	},
})

store.subscribe((mutation, state) => {
	const copy = JSON.parse(JSON.stringify(state));

	for (let name of EPHEMERAL_PROPERTIES) {
		if (copy.hasOwnProperty(name)) {
			delete copy[name];
		}
	}

	if ([
		'reloadExchangeState',
		'setExchangeMatch',
		'toggleSnap'
	].indexOf(mutation.type) === -1) {
		localStorage.setItem('settings', JSON.stringify(copy));
	}

	switch (mutation.type) {
		case 'showExchange':
		case 'hideExchange':
		case 'toggleExchangeVisibility':
		case 'enableExchange':
		case 'disableExchange':
		case 'toggleExchangeOHLC':
		case 'setExchangeMatch':
			store._mutations.reloadExchangeState[0](mutation.payload);

			clearTimeout(this._reloadExchangeStateTimeout);

			this._reloadExchangeStateTimeout = setTimeout(() => {
				store.commit('reloadExchangeState', null);
			}, 500);
		break;
	}
});

export default store;