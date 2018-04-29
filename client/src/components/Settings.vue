<template>
  <div class="settings__container" v-bind:class="{ open: opened }" v-bind:style="{ maxHeight: height + 'px' }">
    <div class="settings__scroller">
      <a href="#" class="toggle-settings icon-times" v-on:click="hideSettings"></a>
      <div class="settings__wrapper" ref="settingsWrapper">
        <div class="settings__column">
          <div class="form-group mb15" title="The current pair" v-bind:class="{ restricted: restricted }">
            <label>Pair</label>
            <input type="string" placeholder="BTCUSD" class="form-control" v-model="options.pair" @change="switchPair" :disabled="restricted">
          </div>
          <div class="form-group mb15" title="VWAP the price line over n ticks">
            <label>Average price</label>
            <input type="number" min="0" max="100" step="1" class="form-control" v-model="options.averageLength">
          </div>
        </div>
        <div class="settings__column">
          <div class="form-group mb15" title="Stack rows on specific amount">
            <label>Stack rows</label>
            <input type="number" min="0" max="10000000" step="10000" class="form-control" v-model="options.groupBy">
          </div>
          <div class="form-group mb15" title="Max rows the app has to render">
            <label>Max rows</label>
            <input type="number" min="0" max="1000" step="1" class="form-control" v-model="options.maxRows">
          </div>
        </div>
        <div class="settings__column" title="Tick length factor/size (% of visible range or time in ms)">
          <div class="form-group mb15">
            <label>Tick length</label>
            <input type="string" placeholder="XX% or XXXXXms" class="form-control" v-model="options.tickLength">
          </div>
        </div>
        <div class="form-group mb15" title="Enable/disable exchanges (from list & chart)">
          <label>Filter exchanges ({{ Math.min(options.exchanges.length, exchanges.length) }} selected)</label>
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
            <label v-if="version.number">v{{ version.number }} <sup class="version-date">{{ version.date }}</sup></label>
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
        version: {
          number: process.env.VERSION,
          date: process.env.BUILD_DATE
        }
      }
    },
    created() {
      socket.$on('admin', () => this.restricted = false);

      socket.$on('exchanges', exchanges => {
        this.exchanges = exchanges;

        // options.exchanges = options.exchanges.filter(selected => this.exchanges.indexOf(selected) !== -1);

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
    z-index: 1;
    visibility: hidden;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    color: white;
    transition: all .8s $easeOutExpo .2s, visibility .1s linear 1.5s;
    pointer-events: none;
    max-height: 0;
    overflow: hidden;

    .settings__scroller {
      max-height: 100%;
      overflow: auto;
      transform: scale(1.2);
      opacity: 0;
      transition: all .2s $easeOutExpo;
      position: relative;

      .settings__wrapper {
        padding: 20px;
      }
    }

    a {
      color: white;
    }

    .version-date {
      opacity: .75;
    }

    .toggle-settings {
      position: absolute;
      right: 4px;
      top: 2px;
      font-size: 24px;
      opacity: .2;

      &:hover {
        opacity: 1;
      }
    }

    .form-group {
      font-size: 12px;
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

    &:not(.open) {
      max-height: 0 !important;
    }

    &.open {
      transition: all .3s $easeOutExpo;
      visibility: visible;
      transform: none;
      background-color: #222;
      pointer-events: auto;

      .settings__scroller {
        transition: all .3s $easeOutExpo .2s;
        transform: none;
        opacity: 1;
      }
    }
  }
</style>
