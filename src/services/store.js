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
	avgPeriods: 2,
	useWeighedAverage: true,
	timeframe: '1.5%',
	wipeCache: true,
	wipeCacheDuration: 15,
	disabled: ['bithumb', 'hitbtc', 'kraken'],
	filters: [],
	debug: false,
	dark: true,
	useShades: true,
	useAudio: false,
	audioIncludeAll: true,
	audioVolume: 1.5,
	settings: [],
	showPlotsSignificants: false,
	showPlotsLiquidations: false,
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
		}
	},
})

store.subscribe((mutation, state) => {
  localStorage.setItem('settings', JSON.stringify(state));

	console.log('save', mutation, state);
});

export default store;