<template>
  <div class="settings__container stack__container" v-bind:class="{ open: opened }" v-bind:style="{ maxHeight: height + 'px' }">
    <div class="stack__wrapper" ref="settingsWrapper">
      <a href="#" class="stack__toggler icon-times" v-on:click="hideSettings"></a>
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
      <div class="settings__column">
        <div class="form-group">
          <label>Threshold <span class="icon-info-circle" v-bind:title="help.threshold" v-tippy></span></label>
          <input type="number" min="0" step="10000" class="form-control" v-model="options.threshold">
        </div>
        <div class="form-group">
          <label>Timeframe <span class="icon-info-circle" v-bind:title="help.timeframe" v-tippy></span></label>
          <input type="string" placeholder="XX% or XXs" class="form-control" v-model="options.timeframe">
        </div>
      </div>
      <div class="settings__column">
        <div class="form-group">
          <label>Avg. price <span class="icon-info-circle" v-bind:title="help.avgPeriods" v-tippy></span></label>
          <input type="number" min="0" max="100" step="1" class="form-control" v-model="options.avgPeriods">
        </div>
        <div class="form-group">
          <label>Avg. tab ↑↓ <span class="icon-info-circle" v-bind:title="help.avgIndicatorPeriods" v-tippy></span></label>
          <input type="number" min="1" max="100" step="1" class="form-control" v-model="options.avgIndicatorPeriods">
        </div>
      </div>
      <div class="mt8 settings__column settings__column--three">
        <div class="form-group">
          <label>Significant <span class="icon-info-circle" v-bind:title="help.significantTradeThreshold" v-tippy></span></label>
          <input type="number" min="0" step="10000" class="form-control" v-model="options.significantTradeThreshold">
        </div>
        <div class="form-group">
          <label>Huge <span class="icon-info-circle" v-bind:title="help.hugeTradeThreshold" v-tippy></span></label>
          <input type="number" v-bind:min="options.significantTradeThreshold" step="10000" class="form-control" v-model="options.hugeTradeThreshold">
        </div>
        <div class="form-group">
          <label>Whale <span class="icon-info-circle" v-bind:title="help.whaleTradeThreshold" v-tippy></span></label>
          <input type="number" v-bind:min="options.hugeTradeThreshold" step="10000" class="form-control" v-model="options.whaleTradeThreshold">
        </div>
      </div>
      <div class="mt8 mb8 form-group">
        <label>Filter exchanges ({{ Math.min(options.exchanges.length, exchanges.length) }} selected) <span class="icon-info-circle" v-bind:title="help.exchanges" v-tippy></span></label>
        <div class="settings__exchanges">
          <a v-for="(exchange, index) in exchanges" v-bind:key="index"
            class="settings__exchanges__item"
            href="#"
            v-on:click="options.toggleExchange(exchange)"
            v-bind:class="{'settings__exchanges__item--active': options.exchanges.indexOf(exchange) !== -1}">
            {{ exchange }}
          </a>
        </div>
      </div>
      <div class="settings__column flex-bottom">
        <div class="form-group">
          <a v-if="version.number" href="javascript:void(0);" target="_blank" title="<a class='donation' href='bitcoin:3GLyZHY8gRS96sH4J9Vw6s1NuE4tWcZ3hX?label=help%20me%20gamble%20on%20bitmex'><div class='text-center'>Like the ticker ?<br>Consider donating :-)</div><img src='static/donate.svg'><div class='donation__address'>3GLyZHY8gRS96sH4J9Vw6s1NuE4tWcZ3hX</div></a>" v-tippy="{animateFill: false, interactive: true, theme: 'blue'}">
            <span>v{{ version.number }} <sup class="version-date">{{ version.date }}</sup></span>
          </a>
        </div>
        <div class="form-group">
          <label class="checkbox-control flex-right">
            <input type="checkbox" class="form-control" v-model="options.dark"> 
            <span>Dark theme</span>
            <div></div>
          </label>
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
        exchanges: [],
        options: options,
        opened: false,
        restricted: true,
        height: 0,
        help: {
          pair: `The pair to aggregate from<br><small><i>special access required</i></small>`,
          avgPeriods: `Periods used to average the price using <i>volume weighed average</i> formula.<br>(2 seems to the give best results)`,
          avgIndicatorPeriods: `Periods used to average smooth up & down tab indicator`,
          maxRows: `Max rows to render`,
          timeframe: `Define how much trades we stack together in the chart, type a amount of seconds or % of the visible range<br>("1.5%" gives good results, 10s is the minimum)`,
          exchanges: `Enable/disable exchanges<br>(exclude from list & chart)`,
          threshold: `Minimum amount a trade should have in order to show up on the list`,
          significantTradeThreshold: `Minimum amount for a trade to be <u>significant</u>`,
          hugeTradeThreshold: `Minimum amount for a trade to be considered as <i>huge</i>`,
          whaleTradeThreshold: `Minimum amount for a trade to enter the supreme <b>whale</b> level`,
        },
        version: {
          number: process.env.VERSION || '0.0.0',
          date: process.env.BUILD_DATE || 'today'
        }
      }
    },
    created() {
      socket.$on('admin', () => this.restricted = false);

      socket.$on('exchanges', exchanges => {
        this.exchanges = exchanges;

        if (!options.exchanges.length) {
          options.exchanges = this.exchanges.filter(exchange => ['bithumb', 'hitbtc'].indexOf(exchange) === -1);
        }
      });

      this.onopen = () => {
        this.height = this.$refs.settingsWrapper.clientHeight;
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
      hideSettings() {
        options.hide();
      },
      switchPair(event) {
        socket.$emit('alert', 'clear');
        socket.send('pair', this.options.pair);
      },
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

    .version-date {
      opacity: .75;
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

              &:before {
                opacity: 1;
                transform: none;
                transition: all .5s $easeOutExpo;
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

          &:before {
            content: unicode($icon-check);
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
        }

        div + span {
          margin-left: 5px;
        }

        span + div {
          margin-left: 5px;
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

        &:last-child {
          margin-right: 0;
        }
      }

      &.settings__column--three > div {
        flex-basis: 50%;
      }

      &:last-child .form-group {
        margin-bottom: 0;
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
          transition: width 0.2s $easeElastic .2s;
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
</style>
