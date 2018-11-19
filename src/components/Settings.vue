<template>
	<div id="settings" class="settings__container stack__container" v-on:click="$event.target === $el && $emit('close')">
    <div class="stack__backdrop"></div>
    <div class="stack__scroller">
      <!-- <a href="https://github.com/Tucsky/SignificantTrades/issues" target="_blank" class="settings__report"><i class="icon-warning"></i> Found a bug or feedback ? Let me know on Github !</a> -->
      <div class="stack__wrapper">
        <a href="#" class="stack__toggler icon-cross" v-on:click="$emit('close')"></a>
        <div class="form-group settings__pair mb8">
          <label>Pair <span class="icon-info-circle" title="The pair to aggregate from" v-tippy></span></label>
          <div class="settings__pair--container">
            <input type="string" placeholder="BTCUSD" class="form-control" v-bind:value="pair" @change="$store.commit('setPair', $event.target.value)">
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="$store.commit('toggleSettingsPanel', 'list')" v-bind:class="{closed: settings.indexOf('list') > -1}">Trades list <i class="icon-up"></i></div>
        <div class="mb8">
          <div class="settings__column">
            <div class="form-group">
              <label>Max rows <span class="icon-info-circle" title="Numbers of trades to keep visible" v-tippy></span></label>
              <input type="number" min="0" max="1000" step="1" class="form-control" v-bind:value="maxRows" @change="$store.commit('setMaxRows', $event.target.value)">
            </div>
            <div class="form-group">
              <label>Decimal precision <span class="icon-info-circle" title="Define how much digits will be displayed after the decimal point" v-tippy></span></label>
              <input type="number" min="0" max="10" step="1" placeholder="auto" class="form-control" v-bind:value="decimalPrecision" @change="$store.commit('setDecimalPrecision', $event.target.value)">
            </div>
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="$store.commit('toggleSettingsPanel', 'thresholds')" v-bind:class="{closed: settings.indexOf('thresholds') > -1}">Thresholds <i class="icon-up"></i></div>
        <div class="settings__thresholds">
          <div class="form-group mb8">
            <label v-for="(threshold, index) in thresholds" :key="`threshold-${index}`">
              <span>Trades </span>{{index == 0 ? "&lt;" : "&gt;"}} <i class="icon-currency"></i> <editable :content="threshold.amount" @output="$store.commit('setThresholdAmount', {index: index, value: $event})"></editable>
                <span v-if="index === 0">won't show up</span>
                <span v-if="index === 1">will be highlighted</span>
                <span v-if="index > 1">
                  will show
                  <editable class="settings__thresholds--gifkeyword" :content="threshold.gif" @output="$store.commit('setThresholdGif', {index: index, value: $event})"></editable>
                </span>
            </label>
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="$store.commit('toggleSettingsPanel', 'audio')" v-bind:class="{closed: settings.indexOf('audio') > -1}">Audio <i class="icon-up"></i></div>
        <div class="settings__audio settings__activable settings__column" v-bind:class="{active: useAudio}">
          <div class="form-group settings__column__tight">
            <label class="checkbox-control checkbox-on-off checkbox-control-input flex-right" v-tippy title="Enable audio">
              <input type="checkbox" class="form-control" v-bind:checked="useAudio" @change="$store.commit('toggleAudio', $event.target.checked)">
              <div></div>
            </label>
          </div>
          <div class="form-group settings__column__tight">
            <label class="checkbox-control checkbox-control-input flex-right" v-tippy title="Include orders down to 10% of significant orders">
              <input type="checkbox" class="form-control" v-bind:checked="audioIncludeInsignificants" @change="$store.commit('toggleaudioIncludeInsignificants', $event.target.checked)">
              <div class="icon-expand"></div>
            </label>
          </div>
          <div class="form-group settings__column__fill">
            <input type="range" min="0" max="5" step=".1" v-bind:value="audioVolume" @change="$store.commit('setAudioVolume', $event.target.value)">
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="$store.commit('toggleSettingsPanel', 'counters')" v-bind:class="{closed: settings.indexOf('counters') > -1}">Counter <i class="icon-up"></i></div>
        <div class="settings__counters settings__activable settings__column" v-bind:class="{active: showCounters}">
          <div class="form-group settings__column__tight">
            <label class="checkbox-control checkbox-on-off checkbox-control-input flex-right" v-tippy title="Enable counters">
              <input type="checkbox" class="form-control" v-bind:checked="showCounters" @change="$store.commit('toggleCounters', $event.target.checked)">
              <div></div>
            </label>
          </div>
          <div class="form-group settings__column__tight">
            <label class="checkbox-control checkbox-control-input flex-right" v-tippy title="Do not show incomplete counters">
              <input type="checkbox" class="form-control" v-bind:checked="hideIncompleteCounter" @change="$store.commit('toggleHideIncompleteCounter', $event.target.checked)">
              <div class="icon-eye-crossed"></div>
            </label>
          </div>
          <div class="form-group settings__column__fill">
            <input type="string" placeholder="Counters step separed by a comma (ie: 1m, 5m, 10m, 15m)" class="form-control" v-bind:value="countersStepsStringified" @change="replaceCounters($event.target.value)">
            <small class="mt8">Write counters intervals separed by a comma (XXs, XXm, XXh ...)</small>
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="$store.commit('toggleSettingsPanel', 'chart')" v-bind:class="{closed: settings.indexOf('chart') > -1}">Chart <i class="icon-up"></i></div>
        <div class="settings__chart settings__activable settings__column" v-bind:class="{active: showChart}">
          <div class="form-group settings__column__tight">
            <label class="checkbox-control checkbox-on-off checkbox-control-input flex-right" v-tippy title="Enable chart">
              <input type="checkbox" class="form-control" v-bind:checked="showChart" @change="$store.commit('toggleChart', $event.target.checked)">
              <div></div>
            </label>
          </div>
          <div class="settings__column__fill">
            <div class="form-group mb8">
              <label class="checkbox-control checkbox-control-input flex-left" v-tippy title="Shows liquidations on the chart">
                <input type="checkbox" class="form-control" v-bind:checked="chartPadding" @change="$store.commit('setChartPadding', $event.target.checked ? .05 : 0)">
                <div></div>
                <span v-on:click.stop.prevent>Add <editable :content="(chartPadding * 100).toFixed(2)" @output="$store.commit('setChartPadding', ($event || 0) / 100)"></editable>% margin on the right</span>
              </label>
            </div>
            <div class="form-group mb8">
              <label class="checkbox-control checkbox-control-input flex-left" v-tippy title="Shows liquidations on the chart">
                <input type="checkbox" class="form-control" v-bind:checked="chartLiquidations" @change="$store.commit('toggleLiquidationsPlot', $event.target.checked)">
                <div></div>
                <span>Liquidations <i class="icon-rip"></i></span>
              </label>
            </div>
            <div class="form-group mb8">
              <label class="checkbox-control checkbox-control-input flex-left" v-tippy title="Wipe invisible data after a while to free memory and speed up the app">
                <input type="checkbox" class="form-control" v-bind:checked="autoClearTrades" @change="$store.commit('toggleAutoClearTrades', $event.target.checked)">
                <div></div>
                <span>Auto cleanup</span>
              </label>
            </div>
          </div>
        </div>
        <div class="mt8 settings__title" v-on:click="$store.commit('toggleSettingsPanel', 'exchanges')" v-bind:class="{closed: settings.indexOf('exchanges') > -1}">Exchanges <i class="icon-up"></i></div>
        <div class="form-group">
          <div class="settings__exchanges">
            <Exchange v-if="exchanges.length" v-for="(exchange, index) in exchanges" v-bind:key="index"  :exchange="exchange" />
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
              <input type="checkbox" class="form-control" v-bind:checked="dark" @change="$store.commit('toggleDark', $event.target.checked)">
              <span>{{ dark ? 'Day mode' : 'Night mode' }}</span>
              <div></div>
            </label>
          </div>
        </div>
      </div>
    </div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from '../services/socket';

import Exchange from './Exchange.vue';

export default {
  components: {
    Exchange
  },
  data() {
    return {
      expanded: [],
      help: {
        avgLength: `
          Define how many periods are used to smooth the chart<br>
          <ol>
            <li>Exchange prices are averaged <strong>within</strong> the tick first (using weighed average in that timeframe if enabled, if not then the close value is used)</li>
            <li>If cumulated periods are > 1 then the price is averaged (using weighed or simple average) using the number of periods you choosed right there (2 by default)</li>
          </ol>
        `,
        timeframe: `
          Define how much trades we stack together in the chart, type a amount of seconds or % of the visible range<br>
          <ul>
            <li>Type 1.5% for optimal result</li>
            <li>Minimum is 5s whatever you enter</li>
          </ul>
        `
      },
      version: {
        number: process.env.VERSION || 'DEV',
        date: process.env.BUILD_DATE || 'now'
      }
    };
  },
  computed: {
    ...mapState([
      'pair',
      'maxRows',
      'decimalPrecision',
      'showCounters',
      'counterPrecision',
      'hideIncompleteCounter',
      'countersSteps',
      'showChart',
      'actives',
      'thresholds',
      'useAudio',
      'audioIncludeInsignificants',
      'audioVolume',
      'timeframe',
      'avgLength',
      'useWeighedAverage',
      'chartLiquidations',
      'chartPadding',
      'autoClearTrades',
      'dark',
      'settings',
    ]),
    exchanges: () => {
      return socket.exchanges;
    }
  },
  created() {
    this.stringifyCounters();
  },
  beforeUpdate(a, b, c) {
    console.log('SETTINGS: before update');
  },
  updated(a, b, c) {
    console.log('SETTINGS: updated');
  },
  methods: {
    stringifyCounters() {
      const now = +new Date();
      this.countersStepsStringified = this.countersSteps.map(a => this.$root.ago(now - a)).join(', ');
    },
    replaceCounters(value) {
      const counters = value.split(',')
        .map(a => {
          a = a.trim();

          if (/[\d.]+s/.test(a)) {
            return parseFloat(a) * 1000;
          } else if (/[\d.]+h/.test(a)) {
            return parseFloat(a) * 1000 * 60 * 60;
          } else {
            return parseFloat(a) * 1000 * 60;
          }
        }).filter(function(item, pos, self) {
          return self.indexOf(item) == pos;
        });


      if (counters.filter(a => isNaN(a)).length) {
        socket.$emit('alert', {
          type: 'error',
          title: `Invalid counter`,
          message: `Your counters (${value}) contains invalid steps.`,
          id: `counter_replace_error`
        });
        return;
      }

      this.$store.commit('replaceCounterSteps', counters);

      this.stringifyCounters();
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
  padding: 7px 6px 6px;
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

    + .app__wrapper {
      transform: scale(1.4);
    }

    .stack__scroller {
      width: 320px;
      height: 100%;
      background: rgba(#222, .8);
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
        background-color: rgba(black, 0.3);
        transition: all 0.2s $easeOutExpo;
        position: relative;
        flex-shrink: 0;

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
          line-height: 0;
        }

        &:not([class^="icon-"]):before {
          content: unicode($icon-check);
        }

        &:after {
          transform: none;
          opacity: 1;
        }
      }

      > span {
        line-height: 1;
      }

      div + span {
        margin-left: 5px;
      }

      span + div {
        margin-left: 5px;
      }

      &.checkbox-control-input {
        > div {
          padding: .8em;
        }
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

      &.checkbox-on-off input ~ div {
        &:before {
          content: unicode($icon-power-on);
        }

        &:after {
          content: unicode($icon-power-off);
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
    height: 32px; /* Specified height */
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

    > .settings__column__tight {
      flex-basis: auto;
      flex-grow: 0;
    }

    > .settings__column__fill {
      flex-basis: 100%;
      max-width: 100%;
    }

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

  .settings__activable {
    .form-group {
      opacity: 0.2;

      &:first-child {
        opacity: 1;
      }
    }

    &.active {
      .form-group {
        opacity: 1;
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
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  &.open {
    background-color: #222;
  }
}
</style>
