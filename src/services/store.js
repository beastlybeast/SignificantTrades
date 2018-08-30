import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

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
	precision: null,
	avgLength: 2,
	useWeighedAverage: true,
	timeframe: '1.5%',
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
	height: null,
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
		setPrecision(state, value) {
			state.precision = value;
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
			if (state.filters.indexOf(exchange) === -1) {
				this.commit('hideExchange', exchange);
			} else {
				this.commit('showExchange', exchange);
			}
		},
		toggleSettingsPanel(state, value) {
      const index = state.settings.indexOf(value);

      if (index === -1) {
        state.settings.push(name);
      } else {
        state.settings.splice(index, 1);
      }
		},
		toggleAudio(state, value) {
			state.useAudio = value ? true : false;
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
			Vue.set(state.thresholds, payload.exchange, payload.threshold);
		}
	},
})

store.subscribe((mutation, state) => {
  localStorage.setItem('settings', JSON.stringify(state));

	console.log('save', mutation, state);
});

export default store;