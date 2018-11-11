import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex);

const EPHEMERAL_PROPERTIES = [
	'isSnaped',
	'actives'
]

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
		kraken: {disabled: true},
		coinex: {ohlc: false},
	},
	maxRows: 20,
	decimalPrecision: null,
	showCounters: true,
	counterPrecision: 1000 * 10,
	hideIncompleteCounter: true,
	showStats: true,
	showChart: true,
	statsPeriod: 1000 * 60,
	countersSteps: [1000 * 60, 1000 * 60 * 5, 1000 * 60 * 15, 1000 * 60 * 30, 1000 * 60 * 60, 1000 * 60 * 60 * 2, 1000 * 60 * 60 * 4],
	avgLength: 2,
	useWeighedAverage: false,
	timeframe: 1000 * 10,
	autoClearTrades: true,
	debug: false,
	dark: true,
	useShades: true,
	useAudio: false,
	audioIncludeInsignificants: true,
	audioVolume: 1.5,
	settings: [],
	chartLiquidations: false,
	chartHeight: null,
	chartRange: 0,

	// runtime state
	isSnaped: true,
	actives: []
}

const store = new Vuex.Store({
	state: Object.assign({}, defaults, JSON.parse(localStorage.getItem('settings')) || {}),
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
		toggleHideIncompleteCounter(state, value) {
			state.hideIncompleteCounter = value ? true : false;
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
		toggleDark(state, value) {
			state.dark = value ? true : false;
		},
		setAudioVolume(state, value) {
			state.audioVolume = value;
		},
		setTimeframe(state, value) {
			state.timeframe = value;
		},
		setAverageLength(state, value) {
			state.avgLength = Math.min(100, Math.max(0, value));
		},
		toggleWeighedAverage(state, value) {
			state.useWeighedAverage = value ? true : false;
		},
		toggleLiquidationsPlot(state, value) {
			state.chartLiquidations = value ? true : false;
		},
		toggleAutoClearTrades(state, value) {
			state.autoClearTrades = value ? true : false;
		},
		setExchangeThreshold(state, payload) {
			Vue.set(state.exchanges[payload.exchange], 'threshold', +payload.threshold);
		},
		toggleExchangeOHLC(state, exchange) {
			Vue.set(state.exchanges[exchange], 'ohlc', state.exchanges[exchange].ohlc === true ? false : true);
		},
		setChartHeight(state, value) {
			state.chartHeight = value || null;
		},
		setChartRange(state, value) {
			state.chartRange = value;
		},

		// runtime commit
		toggleSnap(state, value) {
			state.isSnaped = value ? true : false;
		},
		reloadExchangeState(state, exchange) {
			if (!state.exchanges[exchange]) {
				Vue.set(state.exchanges, exchange, {});
			}

      const index = state.actives.indexOf(exchange);
      const active = !state.exchanges[exchange].disabled && !state.exchanges[exchange].hidden;

      if (active && index === -1) {
        state.actives.push(exchange);
      } else if (!active && index >= 0) {
        state.actives.splice(index, 1);
      }
		},
		trimChart(state, minTimestamp) {
			
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

  localStorage.setItem('settings', JSON.stringify(copy));

	switch (mutation.type) {
		case 'showExchange':
		case 'hideExchange':
		case 'enableExchange':
		case 'disableExchange':
		case 'toggleExchangeOHLC':
			store.commit('reloadExchangeState', mutation.payload);
		break;
	}
});

export default store;