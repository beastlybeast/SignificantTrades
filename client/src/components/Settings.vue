<template>
  <div class="settings__container stack__container" v-bind:class="{ open: opened }" v-bind:style="{ maxHeight: height + 'px' }">
    <div class="stack__wrapper" ref="settingsWrapper">
      <a href="#" class="stack__toggler icon-cross" v-on:click="hideSettings"></a>
      <div class="settings__title" v-on:click="toggleSection('basics')" v-bind:class="{closed: options.settings.indexOf('basics') > -1}">Basics <i class="icon-up"></i></div>
      <div class="settings__column">
        <div class="form-group" v-bind:class="{ restricted: restricted }">
          <label>Pair <span class="icon-info-circle" v-bind:title="help.pair" v-tippy></span></label>
          <input type="string" placeholder="BTCUSD" class="form-control" v-model="options.pair" @change="switchPair" :disabled="restricted">
        </div>
        <div class="form-group">
          <label>Max rows <span class="icon-info-circle" v-bind:title="help.maxRows" v-tippy></span></label>
          <input type="number" min="0" max="1000" step="1" class="form-control" v-model="options.maxRows">
        </div>
      </div>
      <div class="mt8 settings__title" v-on:click="toggleSection('chart')" v-bind:class="{closed: options.settings.indexOf('chart') > -1}">Chart <i class="icon-up"></i></div>
      <div>
        <div class="settings__column">
          <div class="form-group">
            <label>Timeframe <span class="icon-info-circle" v-bind:title="help.timeframe" v-tippy></span></label>
            <input type="string" placeholder="XX% or XXs" class="form-control" v-model="options.timeframe">
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
        <div class="settings__plots settings__column">
          <div class="form-group">
            <label class="checkbox-control flex-right" v-tippy title="Shows significants orders on the chart">
              <input type="checkbox" class="form-control" v-model="options.showPlotsSignificants">
              <span>Show {{options.hugeTradeThreshold}}+</span>
              <div></div>
            </label>
          </div>
          <div class="form-group">
            <label class="checkbox-control flex-right" v-tippy title="Shows liquidations on the chart">
              <input type="checkbox" class="form-control" v-model="options.showPlotsLiquidations">
              <span>Show liquidations</span>
              <div></div>
            </label>
          </div>
        </div>
      </div>
      <div class="mt8 settings__title" v-on:click="toggleSection('exchanges')" v-bind:class="{closed: options.settings.indexOf('exchanges') > -1}">Exchanges <i class="icon-up"></i></div>
      <div class="form-group">
        <div class="settings__exchanges">
          <a v-if="exchanges.length" v-for="(exchange, index) in exchanges" v-bind:key="index"
            class="settings__exchanges__item"
            href="#"
            v-on:click="options.toggleExchange(exchange)"
            v-bind:class="{'settings__exchanges__item--active': options.exchanges.indexOf(exchange) !== -1}">
            {{ exchange }}
          </a>
          <div v-if="!exchanges.length" class="mb8">You are not connected to any exchanges</div>
        </div>
      </div>
      <div class="mt8 settings__title" v-on:click="toggleSection('thresholds')" v-bind:class="{closed: options.settings.indexOf('thresholds') > -1}">Thresholds <i class="icon-up"></i></div>
      <div class="settings__thresholds settings__column">
        <div class="form-group">
          <label><span>Trades </span>&lt; <i class="icon-currency"></i> <editable :content.sync="options.threshold"></editable> won't show up<span class="icon-info-circle" v-bind:title="help.threshold" v-tippy></span></label>
          <label><span>Trades </span>&lt; <i class="icon-currency"></i> <editable :content.sync="options.significantTradeThreshold"></editable> = <u>significant</u> <span class="icon-info-circle" v-bind:title="help.significantTradeThreshold" v-tippy></span></label>
          <label><span>Trades </span>&lt; <i class="icon-currency"></i> <editable :content.sync="options.hugeTradeThreshold"></editable> = <strong>huge</strong> <span class="icon-info-circle" v-bind:title="help.hugeTradeThreshold" v-tippy></span></label>
          <label><span>Trades </span>&lt; <i class="icon-currency"></i> <editable :content.sync="options.rareTradeThreshold"></editable> = <strong><i>rare</i></strong> <span class="icon-info-circle" v-bind:title="help.rareTradeThreshold" v-tippy></span></label>
        </div>
        <div class="form-group" title="Use dynamic shades of green/red to highlight the amount of each significant+ trades" v-tippy>
          <div class="shades" v-bind:class="{active: options.useShades}"></div>
          <label class="checkbox-control flex-right">
            <input type="checkbox" class="form-control" v-model="options.useShades">
            <div></div>
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
      <div class="mt15 settings__column settings__footer flex-middle">
        <div class="form-group">
          <div v-if="version.number">
            <span>v{{ version.number }} <sup class="version-date">{{ version.date }}</sup></span>
            <i class="divider">|</i>
            <a href="javascript:void(0);" v-on:click="reset()"> reset</a>
            <i class="divider">|</i>
            <a href="bitcoin:3GLyZHY8gRS96sH4J9Vw6s1NuE4tWcZ3hX" target="_blank" title="Bitcoin for more <3" v-tippy="{animateFill: false, interactive: true, theme: 'blue'}">donate</a>
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
</template>

<script>
  import options from '../services/options'
  import socket from '../services/socket'

  export default {
    data() {
      return {
        exchanges: [],
        options: options,
        opened: false,
        restricted: true,
        height: 0,
        help: {
          pair: `The pair to aggregate from<br><small><i>special access required</i></small>`,
          avgPeriods: `Define how many periods are used to smooth the chart<br><ol><li>Exchange prices are averaged <strong>within</strong> the tick first (using weighed average in that timeframe if enabled, if not then the close value is used)</li><li>If cumulated periods are > 1 then the price is averaged (using weighed or simple average) using the number of periods you choosed right there (2 by default)</li></ol>`,
          maxRows: `Numbers of trades to keep visible`,
          timeframe: `Define how much trades we stack together in the chart, type a amount of seconds or % of the visible range<br><ul><li>Type 1.5% for optimal result</li><li>Minimum is 5s whatever you enter</li></ul>`,
          exchanges: `Enable/disable exchanges<br>(exclude from list & chart)`,
          threshold: `Minimum amount a trade should have in order to show up on the list`,
          significantTradeThreshold: `Highlight the trade in the list`,
          hugeTradeThreshold: `Shows animation under it !`,
          rareTradeThreshold: `Shows another animation !`,
        },
        version: {
          number: process.env.VERSION || 'DEV',
          date: process.env.BUILD_DATE || 'now'
        },
        autosaveHandler: this.save.bind(this),
      }
    },
    created() {
      window.addEventListener('beforeunload', this.autosaveHandler);

      socket.$on('admin', () => this.restricted = false);

      socket.$on('exchanges', exchanges => {
        this.exchanges = exchanges;

        if (!options.exchanges.length) {
          options.exchanges = this.exchanges.filter(exchange => ['bithumb', 'hitbtc'].indexOf(exchange) === -1);
        }

        setTimeout(() => this.refreshHeight(), 10);
      });

      this.onopen = () => {
        this.refreshHeight();
        this.opened = true;
      };
      this.onclose = () => this.opened = false;
      this.ontoggle = () => {
        if (this.opened) {
          this.onclose();
        } else {
          this.onopen();
        }
      };
    },
    mounted() {
      options.$on('open', this.onopen);
      options.$on('close', this.onclose);
      options.$on('toggle', this.ontoggle);
    },
    beforeDestroy() {
      options.$off('open', this.onopen);
      options.$off('close', this.onclose);
      options.$off('toggle', this.ontoggle);
    },
    methods: {
      refreshHeight() {
        this.height = this.$refs.settingsWrapper.clientHeight;
      },
      hideSettings() {
        options.hide();
      },
      switchPair(event) {
        socket.$emit('alert', 'clear');
        socket.send('pair', options.pair);
      },
      toggleSection(name) {
        const index = options.settings.indexOf(name);

        if (index === -1) {
          options.settings.push(name);
        } else {
          options.settings.splice(index, 1);
        }

        setTimeout(() => this.refreshHeight(), 10);
      },
      save() {
        localStorage.setItem('options', JSON.stringify(options.$data));
      },
      reset() {
        window.removeEventListener('beforeunload', this.autosaveHandler);
        window.localStorage && window.localStorage.clear();

        window.location.reload(true);
      }
    }
  }
</script>

<style lang="scss">
	@import '../assets/sass/variables';

  .settings__container {
    background-color: #222;
    color: white;

    .stack__wrapper {
      padding: 20px;
    }

    a {
      color: white;
    }

    .settings__footer {
      a {
        opacity: .5;

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
        opacity: .75;
        line-height: 0;
      }

      .divider {
        opacity: .2;
        margin: 0 2px;
      }

      .donation {
        display: block;
        font-weight: 600;
        letter-spacing: -.5px;
        font-size: 14px;
        font-family: monospace;
        color: white;
        text-shadow: 0 2px rgba(0, 0, 0, 0.2);

        img {
          width: 100%;
          margin: 0px;
          display: block;
          transition: transform .2s $easeElastic;

          &:active {
            transform: scale(.9);
          }
        }

        .donation__address {
          letter-spacing: -.5px;
          font-size: 10px;
        }
      }
    }

    .form-group {
      display: flex;
      flex-direction: column;

      &.restricted {
        opacity: .5;

        &, input, label {
          cursor: not-allowed;
        }
      }

      .form-control {
        padding: 8px 8px;
        background-color: white;
        border-radius: 2px;
        border: 0;
        width: calc(100% - 16px);
        letter-spacing: -.5px;
        min-width: 0;
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

              &:before, &:after {
                transition: all .5s $easeOutExpo;
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
          padding: .5em;
          width: 1em;
          height: 1em;
          border-radius: 2px;
          background-color: rgba(white, .3);
          transition: all .2s $easeOutExpo;
          position: relative;

          &:before, &:after {
            font-family: 'icon';
            font-size: 1em;
            position: absolute;
            left: 0;
            top: 0;
            right: 0;
            bottom: 0;
            transform: translateY(-50%) skewY(-20deg);
            opacity: 0;
            transition: all .2s $easeOutExpo;
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
          opacity: .3;
          transition: opacity .2s $easeOutExpo;
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
      text-align: left;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: .5px;
      opacity: .5;
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
        transition: transform .2s $easeElastic;
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

    .settings__plots {
      .checkbox-control {
        flex-direction: column;
        padding: 4px 0 10px;

        > span {
          margin-bottom: 5px;
          width: 100%;
          text-align: center;
          line-height: 1.5;
        }
      }
    }

    .settings__audio {
      align-items: center;

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
        opacity: .2;

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

    .settings__thresholds {
      padding-bottom: 4px;

      .shades {
        width: 1.5em;
        height: 1.5em;
        margin-bottom: .8em;
        border-radius: 50%;
        background-color: $green;
        box-shadow: 0 0 0 $green - 30%, 0 0 0 $green - 60%;
        transition: all .4s $easeElastic;

        &.active {
          width: 1em;
          height: 1em;
          margin-bottom: 1.2em;
          box-shadow: 0.4em 0.6em 0 $green - 30%, -0.4em 0.6em 0 $green - 60%;
        }
      }

      .form-group {
        flex-basis: auto;
        flex-grow: 0;
        max-width: none;

        &:first-child {
          flex-grow: 1;
        }

        &:last-child {
          padding: 0 10px;
          justify-content: center;
          align-items: center;
          display: flex;
        }
      }

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
        display: inline-block;
        cursor: text;
        color: $green;
        font-family: monospace;
      }
    }

    .settings__exchanges {
      .settings__exchanges__item {
        padding: 5px 8px;
        background-color: rgba(white, .15);
        color: white;
        transition: all .2s $easeOutExpo;
        border-radius: 2px;
        margin-right: 4px;
        margin-bottom: 4px;
        display: inline-block;
        position: relative;

        &:before {
          content: '';
          position: absolute;
          top: calc(50% - 0px);
          height: 1px;
          background-color: white;
          transition: width 0.2s $easeOutExpo .2s;
          left: 12%;
          width: 76%;
        }

        &.settings__exchanges__item--active {
          background-color: $green;
          color: white;

          &:before {
            width: 0%;
          }
        }
      }
    }

    &.open {
      background-color: #222;
    }
  }
</style>
