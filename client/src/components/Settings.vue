<template>
  <div class="settings__container stack__container" v-bind:class="{ open: opened }" v-bind:style="{ maxHeight: height + 'px' }">
    <div class="stack__wrapper" ref="settingsWrapper">
      <a href="#" class="stack__toggler icon-times" v-on:click="hideSettings"></a>
      <div class="settings__column">
        <div class="form-group mb15" v-bind:class="{ restricted: restricted }">
          <label>Pair <span class="icon-info-circle" v-bind:title="help.pair" v-tippy></span></label>
          <input type="string" placeholder="BTCUSD" class="form-control" v-model="options.pair" @change="switchPair" :disabled="restricted">
        </div>
        <div class="form-group mb15">
          <label>Average price <span class="icon-info-circle" v-bind:title="help.averageLength" v-tippy></span></label>
          <input type="number" min="0" max="100" step="1" class="form-control" v-model="options.averageLength">
        </div>
      </div>
      <div class="settings__column">
        <div class="form-group mb15">
          <label>Stack rows <span class="icon-info-circle" v-bind:title="help.groupBy" v-tippy></span></label>
          <input type="number" min="0" max="10000000" step="10000" class="form-control" v-model="options.groupBy">
        </div>
        <div class="form-group mb15">
          <label>Max rows <span class="icon-info-circle" v-bind:title="help.maxRows" v-tippy></span></label>
          <input type="number" min="0" max="1000" step="1" class="form-control" v-model="options.maxRows">
        </div>
      </div>
      <div class="settings__column">
        <div class="form-group mb15">
          <label>Timeframe <span class="icon-info-circle" v-bind:title="help.timeframe" v-tippy></span></label>
          <input type="string" placeholder="XX% or XXs" class="form-control" v-model="options.timeframe">
        </div>
      </div>
      <div class="form-group mb15">
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
          <a v-if="version.number" href="javascript:void" target="_blank" title="<a href='bitcoin:3GLyZHY8gRS96sH4J9Vw6s1NuE4tWcZ3hX?label=help%20me%20gamble%20on%20bitmex'><img class='donation' src='static/donate.svg'><span>3GLyZHY8gRS96sH4J9Vw6s1NuE4tWcZ3hX</span></a>" v-tippy="{animateFill: false, interactive: true, theme: 'blue'}">
            <span>v{{ version.number }} <sup class="version-date">{{ version.date }}</sup></span>
          </a>
        </div>
        <div class="form-group">
          <label class="label-checkbox flex-right">
            <input type="checkbox" class="form-control" v-model="options.debug"> 
            <span>Show debug</span>
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
          averageLength: `Smooth up the chart by averaging the price using <i>volume weighed average</i> formula across the exchanges.<br>Type the length of average (in ticks, 2 - 5 gives best results)`,
          groupBy: `Minimum amount for a trade to show up in the list below`,
          maxRows: `Max rows to render`,
          timeframe: `Define how much trades we stack together in the chart, type a amount of seconds or % of the visible range<br>("1.5%" gives good results, 10s is the minimum)`,
          exchanges: `Enable/disable exchanges<br>(exclude from list & chart)`
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
        padding: 10px 12px;
        background-color: white;
        border-radius: 2px;
        border: 0;
        width: calc(100% - 24px);

        &[type=checkbox] {
          visibility: hidden;
          position: relative;
          -webkit-appearance: unset;
          height: auto;
          width: auto;
          padding: 0;
          margin: 0;
          cursor: pointer;

          &:before, &:after {
            display: block;
            visibility: visible;
            padding: 5px;
          }

          &:before {
            content: '';
            width: 1em;
            height: 1em;
            border-radius: 2px;
            background-color: rgba(white, .3);
            transition: all .2s $easeOutExpo;
          }

          &:after {
            content: unicode($icon-check);
            font-family: 'icon';
            line-height: 1em;
            font-size: 1em;
            position: absolute;
            left: 0;
            top: 0;
            transform: translateX(-100%) skewX(-10deg);
            opacity: 0;
            transition: all .2s $easeOutExpo;
            color: white;
          }

          &:checked {
            &:after {
              opacity: 1;
              transform: none;
            }

            &:before {
              background-color: $green;
            }
          }
        }
      }

      .label-checkbox {
        display: flex;
        align-items: center;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        cursor: pointer;

        input + span {
          margin-left: 5px !important;
        }

        span + input {
          margin-left: 5px !important;

          &.form-control:after {
            transform: translateX(100%) skewX(10deg);
          }
        }
      }

      > label {
        margin-bottom: 5px;

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
        margin-right: 16px;
        flex-grow: 1;
        flex-basis: 50%;

        &:last-child {
          margin-right: 0;
        }
      }
    }

    .settings__exchanges {
      .settings__exchanges__item {
        padding: 5px 8px;
        background-color: black;
        color: white;
        opacity: .3;
        transition: all .2s $easeOutExpo;
        border-radius: 2px;
        margin-right: 4px;
        margin-bottom: 4px;
        display: inline-block;

        &.settings__exchanges__item--active {
          background-color: $green;
          opacity: 1;
        }
      }
    }

    &.open {
      background-color: #222;
    }
  }

  .donation {
    width: 100%;
    margin: 0px;
    display: block;

    + span {
      display: block;
      font-weight: 600;
      letter-spacing: -.5px;
      font-size: 10px;
      margin-bottom: 2px;
      font-family: monospace;
      color: white;
      text-shadow: 0 2px rgba(0, 0, 0, .2);
    }
  }
</style>
