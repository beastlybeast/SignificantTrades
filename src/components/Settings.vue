<template>
	<div class="settings__container stack__container" v-on:click="$event.target === $el && $emit('close')">
    <div class="stack__backdrop"></div>
    <div class="stack__scroller">
      <a href="https://github.com/Tucsky/SignificantTrades/issues" target="_blank" class="settings__report"><i class="icon-warning"></i> Found a bug or feedback ? Let me know on Github !</a>
      <div class="stack__wrapper">
        <a href="#" class="stack__toggler icon-cross" v-on:click="$emit('close')"></a>
        <div class="form-group settings__pair mb8">
          <label>Pair <span class="icon-info-circle" v-bind:title="help.pair" v-tippy></span></label>
          <div class="settings__pair--container">
            <input type="string" placeholder="BTCUSD" class="form-control" v-model.lazy="options.pair" @change="switchPair">
          </div>
        </div>
        <div class="settings__title" v-on:click="toggleSection('basics')" v-bind:class="{closed: options.settings.indexOf('basics') > -1}">Basics <i class="icon-up"></i></div>
        <div class="mb8">
          <div class="settings__column">
            <div class="form-group">
              <label>Max rows <span class="icon-info-circle" v-bind:title="help.maxRows" v-tippy></span></label>
              <input type="number" min="0" max="1000" step="1" class="form-control" v-model="options.maxRows">
            </div>
            <div class="form-group">
              <label>Precision <span class="icon-info-circle" v-bind:title="help.precision" v-tippy></span></label>
              <input type="number" min="0" max="10" step="1" placeholder="auto" class="form-control" v-model="options.precision">
            </div>
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="toggleSection('exchangeThresholds')" v-bind:class="{closed: options.settings.indexOf('exchangeThresholds') > -1}">Thresholds <i class="icon-up"></i></div>
        <div class="settings__thresholds">
          <div class="form-group mb8">
            <label v-for="(threshold, index) in options.thresholds" :key="`threshold-${index}`">
              <span>Trades </span>&lt; <i class="icon-currency"></i> <editable :content="options.thresholds[index]" @output="$set(options.thresholds, index, $event)"></editable> 
                <span v-if="index === 0">won't show up</span>
                <span v-if="index === 1">will be highlighted</span>
                <span v-if="index > 1">
                  will show
                  <editable class="settings__thresholds--gifkeyword" :content="options.gifsThresholds[index]" @output="$set(options.gifsThresholds, index, $event)"></editable>
                </span>
            </label>
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="toggleSection('audio')" v-bind:class="{closed: options.settings.indexOf('audio') > -1}">Audio <i class="icon-up"></i></div>
        <div class="settings__audio settings__column" v-bind:class="{active: options.useAudio}">
          <div class="form-group">
            <label class="checkbox-control flex-right" v-tippy title="Enable audio">
              <input type="checkbox" class="form-control" v-model="options.useAudio">
              <div></div>
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-control flex-right" v-tippy title="Include insignificants">
              <input type="checkbox" class="form-control" v-model="options.audioIncludeAll">
              <div class="icon-expand"></div>
            </label>
          </div>
          <div class="form-group">
            <input type="range" min="0" max="5" step=".1" v-model="options.audioVolume">
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="toggleSection('chart')" v-bind:class="{closed: options.settings.indexOf('chart') > -1}">Chart <i class="icon-up"></i></div>
        <div>
          <div class="settings__column">
            <div class="form-group">
              <label>Timeframe <span class="icon-info-circle" v-bind:title="help.timeframe" v-tippy></span></label>
              <input type="string" placeholder="XX% or XXs" class="form-control" v-model.lazy="options.timeframe">
            </div>
            <div class="form-group">
              <label>Avg. price <span class="icon-info-circle" v-bind:title="help.avgPeriods" v-tippy></span></label>
              <div class="input-group">
                <input type="number" min="0" max="100" step="1" class="form-control" v-model="options.avgPeriods">
                <label class="checkbox-control flex-right" title="Use weighed average" v-tippy>
                  <input type="checkbox" class="form-control" v-model="options.useWeighedAverage">
                  <div></div>
                </label>
              </div>
            </div>
          </div>
          <div class="settings__chart">
            <div class="form-group mb8" v-if="options.thresholds.length > 0">
              <label class="checkbox-control flex-left" v-tippy title="Shows significants orders on the chart">
                <input type="checkbox" class="form-control" v-model="options.showPlotsSignificants">
                <div></div>
                <span>Highlight {{options.thresholds[1]}}+</span>
              </label>
            </div>
            <div class="form-group mb8">
              <label class="checkbox-control flex-left" v-tippy title="Shows liquidations on the chart">
                <input type="checkbox" class="form-control" v-model="options.showPlotsLiquidations">
                <div></div>
                <span>Highlight liquidations</span>
              </label>
            </div>
            <div class="form-group mb8">
              <label class="checkbox-control flex-left" v-tippy title="Wipe invisible data after a while to free memory and speed up the app">
                <input type="checkbox" class="form-control" v-model="options.wipeCache">
                <div></div>
                <span>Auto-clear data <span v-if="options.wipeCache" v-on:click.stop.prevent>after <editable :content="options.wipeCacheDuration" @output="options.wipeCacheDuration = $event"></editable> minutes</span></span>
              </label>
            </div>
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="toggleSection('exchanges')" v-bind:class="{closed: options.settings.indexOf('exchanges') > -1}">Exchanges <i class="icon-up"></i></div>
        <div class="form-group">
          <div class="settings__exchanges">
            <div v-if="exchanges.length" v-for="(exchange, index) in exchanges" v-bind:key="index"
              class="settings__exchanges__item"
              v-bind:class="{
                'settings__exchanges__item--active': connected.indexOf(exchange) !== -1,
                'settings__exchanges__item--enabled': options.disabled.indexOf(exchange) === -1,
                'settings__exchanges__item--loading': matchs[exchange] && connected.indexOf(exchange) === -1 && options.disabled.indexOf(exchange) === -1,
                'settings__exchanges__item--error': options.disabled.indexOf(exchange) !== -1 && fails[exchange] > 0,
                'settings__exchanges__item--unmatched': !matchs[exchange],
                'settings__exchanges__item--invisible': filters.indexOf(exchange) !== -1,
                'settings__exchanges__item--expanded': expanded.indexOf(exchange) !== -1
              }">
              <div class="settings__exchanges__item__header" v-on:click="options.toggleExchange(exchange)">
                <div class="settings__exchanges__item__name">{{ exchange }}</div>
                <i class="icon-warning"></i>
                <div class="settings__exchanges__item__controls">
                  <button class="settings__exchanges__item__visibility" v-on:click.stop.prevent="options.toggleFilter(exchange)"><i class="icon-invisible"></i></button>
                  <button class="settings__exchanges__item__more" v-on:click.stop.prevent="toggleExpander(exchange)"><i class="icon-down"></i></button>
                </div>
              </div>
              <div class="settings__exchanges__item__detail" v-if="expanded.indexOf(exchange) !== -1">
                <div class="form-group">
                  <label>Threshold <span v-if="exchangeThresholds[exchange] !== 1">({{ formatAmount(exchangeThresholds[exchange] * options.thresholds[0]) }})</span></label>
                  <input type="range" min="0" max="2" step="0.01" v-bind:value="exchangeThresholds[exchange]" @input="setExchangeThreshold(exchange, $event.target.value)">
                </div>
              </div>
            </div>
            <div v-if="!exchanges.length" class="mb8">You are not connected to any exchanges</div>
          </div>
        </div>
        <div class="mt15 settings__column settings__footer flex-middle">
          <div class="form-group">
            <div v-if="version.number">
              <span>v{{ version.number }} <sup class="version-date">{{ version.date }}</sup></span>
              <i class="divider">|</i>
              <a href="javascript:void(0);" v-on:click="reset()"> reset</a>
              <i class="divider">|</i>
              <a href="bitcoin:3NuLQsrphzgKxTBU3Vunj87XADPvZqZ7gc" target="_blank" title="Bitcoin for more <3" v-tippy="{animateFill: false, interactive: true, theme: 'blue'}">donate</a>
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-control settings_luminosity flex-right" title="Switch luminosity" v-tippy>
              <input type="checkbox" class="form-control" v-model="options.dark">
              <span>{{ options.dark ? 'Day mode' : 'Night mode' }}</span>
              <div></div>
            </label>
          </div>
        </div>
      </div>
    </div>
	</div>
</template>

<script>
import options from '../services/options';
import socket from '../services/socket';

export default {
  data() {
    return {
      exchanges: socket.exchanges,
      connected: socket.connected,
      filters: options.filters,
      fails: socket.errors,
      disabled: socket.disabled,
      matchs: socket.matchs,
      options: options,
      exchangeThresholds: Object.assign({}, options.exchangeThresholds),
      expanded: [],
      help: {
        pair: `The pair to aggregate from<br><small><i>special access required</i></small>`,
        avgPeriods: `Define how many periods are used to smooth the chart<br><ol><li>Exchange prices are averaged <strong>within</strong> the tick first (using weighed average in that timeframe if enabled, if not then the close value is used)</li><li>If cumulated periods are > 1 then the price is averaged (using weighed or simple average) using the number of periods you choosed right there (2 by default)</li></ol>`,
        maxRows: `Numbers of trades to keep visible`,
        precision: `Define how much digits will be displayed after the decimal point`,
        timeframe: `Define how much trades we stack together in the chart, type a amount of seconds or % of the visible range<br><ul><li>Type 1.5% for optimal result</li><li>Minimum is 5s whatever you enter</li></ul>`,
        exchanges: `Enable/disable exchanges<br>(exclude from list & chart)`,
        cacheDuration: `Trim invisible chart data after N minutes (to free memory)`,
        threshold: `Minimum amount a trade should have in order to show up on the list`,
        significantTradeThreshold: `Highlight the trade in the list`,
        hugeTradeThreshold: `Shows animation under it !`,
        rareTradeThreshold: `Shows another animation !`
      },
      version: {
        number: process.env.VERSION || 'DEV',
        date: process.env.BUILD_DATE || 'now'
      }
    };
  },
  mounted() {
    socket.$on('exchange_error', this.onExchangeFailed);
  },
  beforeDestroy() {
    socket.$off('exchange_error', this.onExchangeFailed);
  },
  computed: {
    formatAmount: () => window.formatAmount
  },
  methods: {
    onExchangeFailed(exchange, count) {
      this.fails[exchange] = count;
    },
    switchPair(event) {
      socket.$emit('alert', 'clear');
      if (options.pair) {
        options.pair = options.pair.toUpperCase();

        socket.disconnectExchanges();

        setTimeout(() => {
          socket.connectExchanges();
        }, 500);
      }
    },
    toggleSection(name) {
      const index = options.settings.indexOf(name);

      if (index === -1) {
        options.settings.push(name);
      } else {
        options.settings.splice(index, 1);
      }
    },
    setExchangeThreshold(exchange, threshold) {
      this.$set(this.exchangeThresholds, exchange, threshold);
      this.$set(options.exchangeThresholds, exchange, threshold);

      options.save();
    },
    toggleExpander(exchange) {
      const index = this.expanded.indexOf(exchange);

      if (index === -1) {
        if (typeof options.exchangeThresholds[exchange] === 'undefined') {
          options.exchangeThresholds[exchange] = 1;
        }

        this.expanded.push(exchange);
      } else {
        this.expanded.splice(index, 1);
      }
    },
    reset() {
      window.localStorage && window.localStorage.clear();

      window.location.reload(true);
    }
  }
};
</script>

<style lang='scss'>
@import '../assets/sass/variables';

.settings__report {
  display: block;
  padding: 10px;
  background-color: $red;
}

.settings__container {
  background: none !important;
  color: white;

  @media screen and (min-width: 500px) {
    z-index: 2;
    position: fixed;
    height: 100%;
    width: 100%;

    .stack__scroller {
      width: 320px;
      height: 100%;
      background: #222;
    }

    .stack__wrapper {
      display: flex;
      flex-direction: column;
      min-height: calc(100% - 40px);

      > div:last-child {
        margin-top: auto;
        padding-top: 16px;
      }
    }
  }

  .stack__wrapper {
    padding: 20px;
  }

  a {
    color: white;
  }

  .settings__footer {
    a {
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }

    .form-group {
      flex-basis: auto;
      max-width: none;
      flex-grow: 1;
    }

    .version-date {
      opacity: 0.75;
      line-height: 0;
    }

    .divider {
      opacity: 0.2;
      margin: 0 2px;
    }

    .donation {
      display: block;
      font-weight: 600;
      letter-spacing: -0.5px;
      font-size: 14px;
      font-family: monospace;
      color: white;
      text-shadow: 0 2px rgba(0, 0, 0, 0.2);

      img {
        width: 100%;
        margin: 0px;
        display: block;
        transition: transform 0.2s $easeElastic;

        &:active {
          transform: scale(0.9);
        }
      }

      .donation__address {
        letter-spacing: -0.5px;
        font-size: 10px;
      }
    }
  }

  .form-group {
    display: flex;
    flex-direction: column;

    .form-control {
      padding: 8px 8px;
      background-color: white;
      border-radius: 2px;
      border: 0;
      width: calc(100% - 16px);
      letter-spacing: -0.5px;
      min-width: 0;
      height: 100%;
    }

    .input-group {
      display: flex;

      > .form-control {
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }

      > .checkbox-control {
        align-items: stretch;

        > div {
          height: 100%;
          padding: 0 1.25em;
          width: auto;
          border-top-left-radius: 0;
          border-bottom-left-radius: 0;
        }
      }
    }

    .checkbox-control {
      display: flex;
      align-items: center;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      cursor: pointer;

      input {
        display: none;

        &:checked {
          ~ div {
            background-color: $green;

            &:before,
            &:after {
              transition: all 0.5s $easeOutExpo;
            }

            &:before {
              opacity: 1;
              transform: none;
            }

            &:after {
              opacity: 0;
              transform: translateY(50%) skewY(20deg);
            }
          }
        }
      }

      > div {
        padding: 0.5em;
        width: 1em;
        height: 1em;
        border-radius: 2px;
        background-color: rgba(white, 0.3);
        transition: all 0.2s $easeOutExpo;
        position: relative;

        &:before,
        &:after {
          font-family: "icon";
          font-size: 1em;
          position: absolute;
          left: 0;
          top: 0;
          right: 0;
          bottom: 0;
          transform: translateY(-50%) skewY(-20deg);
          opacity: 0;
          transition: all 0.2s $easeOutExpo;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        &:not([class^="icon-"]):before {
          content: unicode($icon-check);
        }

        &:after {
          transform: none;
          opacity: 1;
        }
      }

      div + span {
        margin-left: 5px;
      }

      span + div {
        margin-left: 5px;
      }

      &.settings_luminosity {
        input {
          ~ div {
            background-color: $blue;

            &:before {
              content: unicode($icon-day);
            }

            &:after {
              content: unicode($icon-night);
            }
          }

          &:checked ~ div {
            background-color: $green;
          }
        }
      }
    }

    > label {
      margin-bottom: 5px;
      line-height: 1.3;

      .icon-info-circle {
        margin-left: 2px;
        line-height: 0;
        top: 1px;
        position: relative;
        opacity: 0.3;
        transition: opacity 0.2s $easeOutExpo;
        cursor: help;

        &:hover {
          opacity: 1;
        }
      }

      &:last-child {
        margin: 0;
      }
    }
  }

  input[type="range"] {
    -webkit-appearance: none; /* Override default CSS styles */
    appearance: none;
    height: 24px; /* Specified height */
    background: rgba(black, 0.5); /* Grey background */
    outline: none; /* Remove outline */
    opacity: 0.7; /* Set transparency (for mouse-over effects on hover) */
    -webkit-transition: 0.2s; /* 0.2 seconds transition on hover */
    transition: opacity 0.2s;
    cursor: ew-resize;

    &::-webkit-slider-thumb {
      -webkit-appearance: none; /* Override default look */
      appearance: none;
      width: 8px; /* Set a specific slider handle width */
      height: 24px; /* Slider handle height */
      background: $green + 20%; /* Green background */
      cursor: ew-resize;
    }

    &::-moz-range-thumb {
      width: 8px; /* Set a specific slider handle width */
      height: 24px; /* Slider handle height */
      background: $green + 20%; /* Green background */
      cursor: ew-resize;
    }

    &:hover,
    &:active {
      opacity: 1; /* Fully shown on mouse-over */

      &::-webkit-slider-thumb {
        transform: scale(1.1);
        background: white;
        box-shadow: 0 0 2px rgba(white, 0.2), 0 0 20px rgba(white, 0.5);
      }

      &::-moz-slider-thumb {
        transform: scale(1.1);
        background: white;
        box-shadow: 0 0 2px rgba(white, 0.2), 0 0 20px rgba(white, 0.5);
      }
    }
  }

  [contenteditable] {
    display: inline-block;
    cursor: text;
    font-family: monospace;
    color: $green;

    -webkit-touch-callout: auto;
    -webkit-user-select: auto;
    -khtml-user-select: auto;
    -moz-user-select: auto;
    -ms-user-select: auto;
    user-select: auto;
  }

  .settings__column {
    display: flex;
    flex-direction: row;

    > div {
      margin-right: 8px;
      margin-bottom: 8px;
      flex-grow: 1;
      flex-basis: 50%;
      max-width: 50%;

      &:last-child {
        margin-right: 0;
      }
    }

    &:last-child .form-group {
      margin-bottom: 0;
    }
  }

  .settings__title {
    width: 100%;
    display: inline-block;
    text-align: left;
    margin-bottom: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.5;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;

    &:hover {
      opacity: 1;
      cursor: pointer;
    }

    .icon-up {
      transition: transform 0.2s $easeElastic;
      display: inline-block;
    }

    &.closed {
      .icon-up {
        transform: rotateZ(180deg);
      }

      + div {
        display: none;
      }
    }
  }

  .settings__audio {
    align-items: center;
    padding-bottom: 8px;

    label {
      margin: 0;
    }

    input[type="range"] {
      width: 100%;
      margin: 0;
    }

    .form-group {
      flex-basis: auto;
      flex-grow: 0;
      margin: 0 1em 0 0;
      max-width: none;
      opacity: 0.2;

      &:first-child {
        opacity: 1;
      }

      &:last-child {
        flex-grow: 1;
        width: 100%;
      }
    }

    &.active {
      .form-group {
        opacity: 1;
      }
    }
  }

  .settings__pair {
    margin-bottom: 8px;

    .settings__pair--container {
      margin: 0 -20px;

      input {
        margin: 0;
        width: calc(100% - 38px);
        border-radius: 0;
        padding: 12px 19px;
        font-size: 16px;
        letter-spacing: 0px;
        font-weight: 700;
        color: white;
        background-color: rgba(black, 0.25);
      }
    }
  }

  .settings__thresholds {
    .label {
      margin-bottom: 2px;
    }

    span {
      margin-right: 4px;
      display: none;

      @media only screen and (min-width: 320px) {
        display: inline-block;
      }
    }

    .icon-currency {
      color: $green;
    }

    [contenteditable] {
      min-width: 40px;

      &.settings__thresholds--gifkeyword {
        &:empty:before {
          content: "nothing";
          opacity: 0.4;
        }

        &:not(:empty):after {
          content: "gifs";
          font-family: inherit;
          color: white;
          margin-left: 5px;
          position: absolute;
          pointer-events: none;
        }
      }
    }
  }

  .settings__exchanges {
    display: flex;
    flex-direction: column;

    .settings__exchanges__item {
      background-color: rgba(white, 0.15);
      color: white;
      transition: all 0.2s $easeOutExpo;
      border-radius: 2px;
      margin-bottom: 4px;
      overflow: hidden;

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

        .icon-invisible:before {
          content: unicode($icon-visible);
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

    .settings__exchanges__item__name {
      position: relative;
      padding: 8px;

      &:before {
        content: "";
        position: absolute;
        top: calc(50% - 0px);
        height: 1px;
        background-color: white;
        transition: width 0.2s $easeOutExpo 0.2s;
        left: 12%;
        width: 76%;
      }
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
        animation: sk-scaleout 1s infinite ease-in-out;
        transition: all 0.2s $easeElastic, visibility 0.2s linear 0.2s;
        left: 3px;
        display: none;
        align-self: center;
        position: relative;

        opacity: 0;

        @keyframes sk-scaleout {
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
  }

  &.open {
    background-color: #222;
  }
}
</style>
