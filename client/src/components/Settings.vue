<template>
  <div class="settings__container stack__container" v-bind:class="{ open: opened }" v-bind:style="{ maxHeight: height + 'px' }">
    <div class="stack__wrapper" ref="settingsWrapper">
      <a href="#" class="stack__toggler icon-times" v-on:click="hideSettings"></a>
      <div class="settings__title">Basics</div>
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
      <div class="mt8 settings__title">Chart</div>
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
      <div class="mt8 settings__title">Thresholds</div>
      <div class="settings__thresholds settings__column">
        <div class="form-group">
          <label>Trades < <i class="icon-currency"></i> <editable :content.sync="options.threshold"></editable> won't show up<span class="icon-info-circle" v-bind:title="help.threshold" v-tippy></span></label>
          <label>Trades > <i class="icon-currency"></i> <editable :content.sync="options.significantTradeThreshold"></editable> = <u>significant</u> <span class="icon-info-circle" v-bind:title="help.significantTradeThreshold" v-tippy></span></label>
          <label>Trades > <i class="icon-currency"></i> <editable :content.sync="options.hugeTradeThreshold"></editable> = <strong>huge</strong> <span class="icon-info-circle" v-bind:title="help.hugeTradeThreshold" v-tippy></span></label>
          <label>Trades > <i class="icon-currency"></i> <editable :content.sync="options.rareTradeThreshold"></editable> = <strong><i>rare</i></strong> <span class="icon-info-circle" v-bind:title="help.rareTradeThreshold" v-tippy></span></label>
        </div>
        <div class="form-group">
          <label class="checkbox-control flex-right" title="Use shades of green/red<br><ul><li>higher sell = darker</li><li>higher buy = brighter</li></ul><small><i class='icon-warning'></i> Not suited for color blind users</small>" v-tippy>
            <input type="checkbox" class="form-control" v-model="options.useShades">
            <div></div>
          </label>
        </div>
      </div>
      <div class="mt8 settings__title">Exchanges</div>
      <div class="mb8 form-group">
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
          <a v-if="version.number" href="javascript:void(0);" target="_blank">
            <span title="<a class='donation' href='bitcoin:3GLyZHY8gRS96sH4J9Vw6s1NuE4tWcZ3hX?label=help%20me%20gamble%20on%20bitmex'><div class='text-center'>Like the ticker ?<br>Consider donating :-)</div><img src='static/donate.svg'><div class='donation__address'>3GLyZHY8gRS96sH4J9Vw6s1NuE4tWcZ3hX</div></a>" v-tippy="{animateFill: false, interactive: true, theme: 'blue'}">v{{ version.number }} <sup class="version-date">{{ version.date }}</sup></span>
          </a>
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

          &:before {
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
    }

    .settings__thresholds {
      padding-bottom: 4px;

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
          display: flex;
        }
      }

      .label {
        margin-bottom: 2px;
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
