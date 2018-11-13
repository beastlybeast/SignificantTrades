<template>
	<div
		class="settings__exchanges__item"
		v-bind:class="{
			'settings__exchanges__item--active': exchange.connected,
			'settings__exchanges__item--enabled': !settings.disabled,
			'settings__exchanges__item--loading': !settings.disabled && !exchange.connected && exchange.valid,
			'settings__exchanges__item--error': exchange.error,
			'settings__exchanges__item--unmatched': !exchange.valid,
			'settings__exchanges__item--invisible': settings.hidden,
			'settings__exchanges__item--expanded': expanded
		}">
		<div class="settings__exchanges__item__header" v-on:click="toggleExchange(exchange)">
			<div class="settings__exchanges__item__identity">
				<div class="settings__exchanges__item__name">{{ exchange.id }}</div>
				<small class="settings__exchanges__item__error" v-if="exchange.error">{{ exchange.error }}</small>
				<small class="settings__exchanges__item__price" v-if="exchange.price">{{ $root.formatPrice(exchange.price) }}</small>
			</div>
			<div class="settings__exchanges__item__controls">
				<button class="settings__exchanges__item__visibility" v-tippy v-bind:title="exchange.hidden ? 'Show' : 'Hide (from everything)'" v-on:click.stop.prevent="$store.commit('toggleExchangeVisibility', exchange.id)"><i class="icon-eye-crossed"></i></button>
				<button class="settings__exchanges__item__more" v-on:click.stop.prevent="expanded = !expanded"><i class="icon-down"></i></button>
			</div>
		</div>
		<div class="settings__exchanges__item__detail" v-if="expanded">
			<div class="form-group">
				<label>Threshold <span v-if="exchanges[exchange.id].threshold !== 1">x{{exchanges[exchange.id].threshold}}</span></label>
				<input type="range" min="0" max="2" step="0.01" v-bind:value="exchanges[exchange.id].threshold" @change="$store.commit('setExchangeThreshold', {exchange: exchange.id, threshold: $event.target.value})">
			</div>
			<div class="form-group mt8">
				<label class="checkbox-control" v-tippy title="Include exchange in main candlestick chart">
					<input type="checkbox" class="form-control" v-bind:checked="settings.ohlc !== false" @change="$store.commit('toggleExchangeOHLC', exchange.id)">
					<div></div>
					<span>Include in OHLC</span>
				</label>
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
			'exchanges'
    ]),
		settings() {
			return this.$store.state.exchanges[this.exchange.id];
		}
  },
	methods: {
    toggleExchange(exchange) {
			if (!this.settings.disabled) {
        exchange.disconnect();

        this.$store.commit('disableExchange', exchange.id);
			} else {
				exchange.connect(this.pair);

        this.$store.commit('enableExchange', exchange.id);
			}
    },
	}
}
</script>

<style lang='scss'>
@import '../assets/sass/variables';

.settings__exchanges__item {
	background-color: rgba(white, 0.15);
	color: white;
	transition: all 0.2s $easeOutExpo;
	border-radius: 2px;
	margin-bottom: 8px;
	overflow: hidden;
	flex-basis: calc(50% - 4px);

	&:nth-child(odd) {
		margin-right: 8px;
	}

	&.settings__exchanges__item--loading {
		background-color: $blue;

		.settings__exchanges__item__header:before {
			transition: all 0.2s $easeElastic;
			display: block;
			opacity: 1;
			width: 16px;
			height: 16px;
		}
	}

	&.settings__exchanges__item--enabled {
		.settings__exchanges__item__name:before {
			width: 0%;
		}
	}

	&.settings__exchanges__item--active {
		background-color: $green;
		color: white;

		.settings__exchanges__item__visibility {
			display: flex;
		}

		&.settings__exchanges__item--invisible {
			.icon-visibility:before {
				transform: scale(1.2) rotateY(180deg);
			}
		}
	}

	&.settings__exchanges__item--invisible {
		opacity: 0.8;

		.icon-eye-crossed:before {
			content: unicode($icon-eye);
		}
	}

	&.settings__exchanges__item--error {
		background-color: $red;

		.icon-warning {
			display: block;
			margin-left: 5px;
		}
	}

	&.settings__exchanges__item--unmatched {
		background-color: #555;

		color: rgba(white, 0.75);
	}

	&.settings__exchanges__item--expanded {
		.settings__exchanges__item__more i:before {
			content: unicode($icon-up);
		}
	}
}

.settings__exchanges__item__identity {
	position: relative;
	margin: 0px 10px;
	display: flex;
	flex-direction: column;
	height: 40px;
	justify-content: center;
}

.settings__exchanges__item__name {
	position: relative;

	&:before {
		content: "";
		position: absolute;
		top: calc(50% - 0px);
		height: 1px;
		background-color: white;
		transition: width 0.2s $easeOutExpo 0.2s;
		left: -2px;
		width: calc(100% + 4px);
	}
}

.settings__exchanges__item__price {
	opacity: .8;
}

.settings__exchanges__item__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	position: relative;
	cursor: pointer;

	&:before {
		content: "";
		width: 0px;
		height: 0px;

		background-color: #fff;
		border-radius: 50%;
		animation: circle-scaleout 1s infinite ease-in-out;
		transition: all 0.2s $easeElastic, visibility 0.2s linear 0.2s;
		left: 3px;
		display: none;
		align-self: center;
		position: relative;

		opacity: 0;

		@keyframes circle-scaleout {
			0% {
				-webkit-transform: scale(0);
				transform: scale(0);
			}
			100% {
				-webkit-transform: scale(1);
				transform: scale(1);
				opacity: 0;
			}
		}
	}

	.icon-warning {
		display: none;
	}
}

.settings__exchanges__item__controls {
	display: flex;
	margin-left: auto;
	align-self: stretch;

	.settings__exchanges__item__visibility {
		display: none;
	}

	button {
		border: 0;
		background: none;
		cursor: pointer;
		color: white;
		font-size: 18px;
		display: flex;

		&:hover {
			background-color: rgba(white, 0.1);
		}
	}
}

.settings__exchanges__item__detail {
	padding: 10px;
	background-color: rgba(black, 0.25);
}
</style>
