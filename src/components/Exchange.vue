<template>
	<div
		class="settings-exchange"
		v-bind:class="{
			'-active': exchange.connected,
			'-enabled': !settings.disabled,
			'-loading': !settings.disabled && !exchange.connected && exchange.valid,
			'-error': exchange.error,
			'-unmatched': !exchange.valid,
			'-invisible': settings.hidden,
			'-expanded': expanded
		}">
		<div class="settings-exchange__header" v-on:click="toggleExchange(exchange)">
      <span v-if="!isNaN(settings.threshold) && settings.threshold !== 1" class="settings-exchange__threshold">×{{ settings.threshold }}</span>
			<div class="settings-exchange__identity">
				<div class="settings-exchange__name">{{ exchange.id }}
          <i v-if="settings.ohlc !== false" class="icon-line-chart"></i>
        </div>
				<small class="settings-exchange__error" v-if="exchange.error">{{ exchange.error }}</small>
				<small class="settings-exchange__price" v-if="exchange.price" v-html="$root.formatPrice(exchange.price)"></small>
			</div>
			<div class="settings-exchange__controls">
				<button class="settings-exchange__visibility" v-tippy v-bind:title="exchange.hidden ? 'Show' : 'Hide (from everything)'" v-on:click.stop.prevent="$store.commit('toggleExchangeVisibility', exchange.id)"><i class="icon-eye"></i></button>
				<button class="settings-exchange__more" v-on:click.stop.prevent="expanded = !expanded"><i class="icon-down"></i></button>
			</div>
		</div>
		<div class="settings-exchange__detail" v-if="expanded">
			<div class="form-group">
				<label>Threshold <span v-if="exchanges[exchange.id].threshold !== 1">x{{exchanges[exchange.id].threshold}}</span></label>
        <slider :step=".01" :min="0" :max="2" :value="exchanges[exchange.id].threshold"
        @reset="$store.commit('setExchangeThreshold', {exchange: exchange.id, threshold: 1})"
        @output="$store.commit('setExchangeThreshold', {exchange: exchange.id, threshold: $event})" />
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

.settings-exchange {
	background-color: rgba(white, 0.15);
	color: white;
	transition: all 0.2s $easeOutExpo;
	border-radius: 2px;
	margin-bottom: 8px;
	flex-basis: calc(50% - 4px);
  max-width: calc(50% - 4px);

	&:nth-child(odd) {
		margin-right: 8px;
	}

	&.-loading {
		background-color: $blue;

		.settings-exchange__header:before {
			transition: all 0.2s $easeElastic;
			display: block;
			opacity: 1;
			width: 16px;
			height: 16px;
		}
	}

	&.-enabled {
		.settings-exchange__threshold {
			display: block;
		}

		.settings-exchange__name:before {
			width: 0%;
		}
	}

	&.-active {
		background-color: $green;
		color: white;

		.settings-exchange__visibility {
			display: flex;
		}

		&.-invisible {
			.icon-visibility:before {
				transform: scale(1.2) rotateY(180deg);
			}
		}
	}

	&.-invisible {
		opacity: 0.8;

		.icon-eye:before {
			content: unicode($icon-eye-crossed);
		}
	}

	&.-error {
		background-color: $red;

		.icon-warning {
			display: block;
			margin-left: 5px;
		}
	}

	&.-unmatched {
		background-color: #555;

		color: rgba(white, 0.75);
	}

	&.-expanded {
		.settings-exchange__more i:before {
			content: unicode($icon-up);
		}
	}
}

.settings-exchange__identity {
	position: relative;
	margin: 0px 10px;
	display: flex;
	flex-direction: column;
	height: 40px;
	justify-content: center;
}

.settings-exchange__name {
	position: relative;
	margin-right: auto;

	.icon-line-chart {
		position: absolute;
    right: -1.5em;
    top: .05em;
	}

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

.settings-exchange__price {
	opacity: .8;
}

.settings-exchange__threshold {
  display: none;
  position: absolute;
  top: -.5em;
  right: -.5em;
  pointer-events: none;
  font-size: 90%;
  background-color: $blue;
  border-radius: 2px;
  color: white;
  padding: .1em .2em;
  box-shadow: 0 0 0 1px rgba(black, .2);
}

.settings-exchange__header {
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

.settings-exchange__controls {
	display: flex;
	margin-left: auto;
	align-self: stretch;

	.settings-exchange__visibility {
		display: none;
	}

	button {
		border: 0;
		background: none;
		cursor: pointer;
		color: white;
		font-size: 18px;
		display: flex;
		align-items: center;

		&:hover {
			background-color: rgba(white, 0.1);
		}
	}
}

.settings-exchange__detail {
	padding: 10px;
	background-color: rgba(black, 0.25);
}
</style>
