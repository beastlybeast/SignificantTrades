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
	exchangeThresholds: {},
	maxRows: 20,
	decimalPrecision: null,
	showCounters: true,
	counterPrecision: 1000 * 10,
	hideEmptyCounter: true,
	showStats: true,
	statsPeriod: 1000 * 60,
	countersSteps: [1000 * 30, 1000 * 60, 1000 * 60 * 2, 1000 * 60 * 5, 1000 * 60 * 10, 1000 * 60 * 15],
	avgLength: 2,
	useWeighedAverage: false,
	timeframe: 1000 * 10,
	autoWipeCache: true,
	autoWipeCacheDuration: 15,
	disabled: ['bithumb', 'hitbtc', 'kraken'],
	filters: [],
	debug: false,
	dark: true,
	useShades: true,
	useAudio: false,
	audioIncludeInsignificants: true,
	audioVolume: 1.5,
	settings: [],
	chartSignificantOrders: false,
	chartLiquidations: false,
	chartHeight: null,

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
		toggleStats(state, value) {
			state.showStats = value ? true : false;
		},
		toggleHideEmptyCounter(state, value) {
			state.hideEmptyCounter = value ? true : false;
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
		enableExchange(state, value) {
			if (state.disabled.indexOf(value) !== -1) {
				state.disabled.splice(state.disabled.indexOf(value), 1);
			}
		},
		disableExchange(state, value) {
			if (state.disabled.indexOf(value) === -1) {
				state.disabled.push(value);
			}
		},
		showExchange(state, value) {
			if (state.filters.indexOf(value) === -1) {
				state.filters.push(value);
			}
		},
		hideExchange(state, value) {
			if (state.filters.indexOf(value) !== -1) {
				state.filters.splice(state.filters.indexOf(value), 1);
			}
		},
		toggleExchangeVisibility(state, exchange) {
			if (state.filters.indexOf(exchange.id) !== -1) {
				this.commit('hideExchange', exchange.id);
			} else {
				this.commit('showExchange', exchange.id);
			}
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
		toggleaudioIncludeInsignificants(state, value) {
			state.audioIncludeInsignificants = value ? true : false;
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
		toggleSignificantOrdersPlot(state, value) {
			state.chartSignificantOrders = value ? true : false;
		},
		toggleLiquidationsPlot(state, value) {
			state.chartLiquidations = value ? true : false;
		},
		toggleAutoWipeCache(state, value) {
			state.autoWipeCache = value ? true : false;
		},
		setAutoWipeCacheDuration(state, value) {
			state.autoWipeCacheDuration = Math.min(1, value || 0);
		},
		setExchangeThreshold(state, payload) {
			Vue.set(state.exchangeThresholds, payload.exchange, +payload.threshold);
		},
		setChartHeight(state, value) {
			state.chartHeight = value || null;
		},

		// runtime commit
		toggleSnap(state, value) {
			state.isSnaped = value ? true : false;
		},
		reloadExchangeState(state, exchange) {
      const index = state.actives.indexOf(exchange);
      const active = state.disabled.indexOf(exchange) === -1 && state.filters.indexOf(exchange) === -1;

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

  localStorage.setItem('settings', JSON.stringify(copy));

	switch (mutation.type) {
		case 'showExchange':
		case 'hideExchange':
		case 'enableExchange':
		case 'disableExchange':
			console.log('store', mutation.type, ' => reloadExchangeState')
			store.commit('reloadExchangeState', mutation.payload);
		break;
	}
});

export default store;