<template>
	<div
		class="settings__exchanges__item"
		v-bind:class="{
			'settings__exchanges__item--active': exchange.connected,
			'settings__exchanges__item--enabled': disabled.indexOf(exchange.id) === -1,
			'settings__exchanges__item--loading': disabled.indexOf(exchange.id) === -1 && !exchange.connected && exchange.valid,
			'settings__exchanges__item--error': false,
			'settings__exchanges__item--unmatched': !exchange.valid,
			'settings__exchanges__item--invisible': filters.indexOf(exchange.id) !== -1,
			'settings__exchanges__item--expanded': expanded
		}">
		<div class="settings__exchanges__item__header" v-on:click="toggleExchange(exchange)">
			<div class="settings__exchanges__item__identity">
				<div class="settings__exchanges__item__name">{{ exchange.id }}</div>
				<small class="settings__exchanges__item__price">{{ $root.formatPrice(exchange.price) }}</small>
			</div>
			<i class="icon-warning"></i>
			<div class="settings__exchanges__item__controls">
				<button class="settings__exchanges__item__visibility" v-on:click.stop.prevent="$store.commit('toggleExchangeVisibility', exchange)"><i class="icon-invisible"></i></button>
				<button class="settings__exchanges__item__more" v-on:click.stop.prevent="expanded = !expanded"><i class="icon-down"></i></button>
			</div>
		</div>
		<div class="settings__exchanges__item__detail" v-if="expanded">
			<div class="form-group">
				<label>Threshold <span v-if="exchangeThresholds[exchange.id] !== 1">x{{exchangeThresholds[exchange.id]}}</span></label>
				<input type="range" min="0" max="2" step="0.01" v-bind:value="exchangeThresholds[exchange.id]" @change="$store.commit('setExchangeThreshold', {exchange: exchange.id, threshold: $event.target.value})">
			</div>
		</div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from '../services/socket';

export default {
	data() {
		return {
			expanded: false
		}
	},
	props: ['exchange'],
  computed: {
    ...mapState([
      'pair',
      'filters',
      'disabled',
			'exchangeThresholds',
    ]),
		price() {
			return this.$root.ago(+new Date() - exchange.price)
		}
  },
  beforeUpdate(a, b, c) {
    console.log('EXCHANGE ' + this.exchange.id + ': before update');
  },
  updated(a, b, c) {
    console.log('EXCHANGE ' + this.exchange.id + ': updated');
  },
  mounted() {
    socket.$on('exchange_error', this.onExchangeFailed);
  },
  beforeDestroy() {
    socket.$off('exchange_error', this.onExchangeFailed);
  },
	methods: {
    toggleExchange(exchange) {
			const index = this.disabled.indexOf(exchange.id);

			if (index === -1) {
        exchange.disconnect();

        this.$store.commit('disableExchange', exchange.id);
			} else {
				exchange.connect(this.pair);

        this.$store.commit('enableExchange', exchange.id);
			}
    },
    onExchangeFailed(exchange, count) {
      this.fails[exchange] = count;
    },
	}
}
</script>