<template>
  <div
    id="settings"
    class="settings__container stack__container"
    @click="$event.target === $el && $emit('close')"
  >
    <div ref="tippin" v-if="tippin" class="tippin-me">
      <iframe
        src="https://tippin.me/buttons/send-lite.php?u=Tucsky"
        frameborder="0"
        scrolling="no"
      ></iframe>
    </div>
    <div class="stack__backdrop"></div>
    <div class="stack__scroller">
      <!-- <a href="https://github.com/Tucsky/SignificantTrades/issues" target="_blank" class="settings__report"><i class="icon-warning"></i> Found a bug or feedback ? Let me know on Github !</a> -->
      <div class="stack__wrapper">
        <a
          href="#"
          class="stack__toggler icon-cross"
          @click="$emit('close')"
        ></a>
        <div class="form-group settings-pair mb8">
          <label
            >Pair
            <span
              class="icon-info-circle"
              title="The pair to aggregate from"
              v-tippy
            ></span
          ></label>
          <input
            type="string"
            placeholder="BTCUSD"
            class="form-control"
            :value="pair"
            @change="$store.commit('setPair', $event.target.value)"
          />
          <small class="help-text mt8" v-if="showPairSubdomainHelp"
            ><i class="icon-info-circle"></i> Consider using
            <a :href="'https://' + pair.toLowerCase() + '.aggr.trade'"
              >https://{{ pair.toLowerCase() }}.aggr.trade</a
            >
            to hook your settings to <strong>{{ pair }}</strong> indefinitely
            !</small
          >
        </div>
        <div
          class="settings__title"
          @click="$store.commit('toggleSettingsPanel', 'list')"
          :class="{ closed: settings.indexOf('list') > -1 }"
        >
          Trades list <i class="icon-up"></i>
        </div>
        <div class="mb8">
          <div class="column">
            <div class="form-group column__fill">
              <label
                >Max rows
                <span
                  class="icon-info-circle"
                  title="Numbers of trades to keep visible"
                  v-tippy
                ></span
              ></label>
              <input
                type="number"
                min="0"
                max="1000"
                step="1"
                class="form-control"
                :value="maxRows"
                @change="$store.commit('setMaxRows', $event.target.value)"
              />
            </div>
            <div class="form-group column__tight">
              <label
                >Precision
                <span
                  class="icon-info-circle"
                  title="Round prices to n decimals"
                  v-tippy
                ></span
              ></label>
              <input
                type="number"
                min="0"
                max="10"
                step="1"
                placeholder="auto"
                class="form-control"
                :value="decimalPrecision"
                @change="
                  $store.commit('setDecimalPrecision', $event.target.value)
                "
              />
            </div>
            <div
              class="form-group column__tight"
              title="Show exchange's logo"
              v-tippy
            >
              <label>Logo</label>
              <label class="checkbox-control checkbox-control-input flex-right">
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="showLogos"
                  @change="$store.commit('toggleLogos', $event.target.checked)"
                />
                <div></div>
              </label>
            </div>
            <div
              class="form-group column__tight"
              title="ONLY show liquidations"
              v-tippy
            >
              <label>Liqs</label>
              <label class="checkbox-control checkbox-control-input flex-right">
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="liquidationsOnlyList"
                  @change="
                    $store.commit(
                      'toggleLiquidationsOnlyList',
                      $event.target.checked
                    )
                  "
                />
                <div></div>
              </label>
            </div>
          </div>
        </div>
        <div
          class="settings__title"
          @click="$store.commit('toggleSettingsPanel', 'thresholds')"
          :class="{ closed: settings.indexOf('thresholds') > -1 }"
        >
          Thresholds <i class="icon-up"></i>
        </div>
        <div class="settings-thresholds">
          <a
            href="javascript:void(0);"
            class="settings-thresholds__display-toggle"
            v-tippy
            title="Switch thresholds display"
            @click="
              $store.commit('toggleTresholdsTable', !showThresholdsAsTable)
            "
            >{{ showThresholdsAsTable ? 'slider' : 'table' }}</a
          >
          <Thresholds ref="thresholdsComponent" />
        </div>
        <div
          class="settings__title"
          @click="$store.commit('toggleSettingsPanel', 'audio')"
          :class="{ closed: settings.indexOf('audio') > -1 }"
        >
          Audio <i class="icon-up"></i>
        </div>
        <div
          class="settings-audio settings__activable column"
          :class="{ active: useAudio }"
        >
          <div class="form-group column__tight">
            <label
              class="checkbox-control -on-off checkbox-control-input flex-right"
              v-tippy="{ placement: 'bottom' }"
              title="Enable audio"
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="useAudio"
                @change="$store.commit('toggleAudio', $event.target.checked)"
              />
              <div></div>
            </label>
          </div>
          <div class="form-group column__tight">
            <label
              class="checkbox-control checkbox-control-input flex-right"
              v-tippy
              title="Include orders down to 10% of significant orders"
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="audioIncludeInsignificants"
                @change="
                  $store.commit(
                    'toggleAudioIncludeInsignificants',
                    $event.target.checked
                  )
                "
              />
              <div class="icon-expand"></div>
            </label>
          </div>
          <div class="form-group column__fill">
            <input
              type="range"
              min="0"
              max="10"
              step=".1"
              :value="audioVolume"
              @change="$store.commit('setAudioVolume', $event.target.value)"
            />
          </div>
        </div>
        <div
          class="settings__title"
          @click="$store.commit('toggleSettingsPanel', 'stats')"
          :class="{ closed: settings.indexOf('stats') > -1 }"
        >
          Stats <i class="icon-up"></i>
        </div>
        <div
          class="settings-stats settings__activable column"
          :class="{ active: showStats }"
        >
          <div class="form-group column__tight">
            <label
              class="checkbox-control -on-off checkbox-control-input flex-right"
              v-tippy="{ placement: 'bottom' }"
              title="Enable stats"
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="showStats"
                @change="$store.commit('toggleStats', $event.target.checked)"
              />
              <div></div>
            </label>
          </div>
          <div class="form-group column__fill">
            <input
              v-tippy
              title="Timeframe to watch (ie: 1m)"
              type="string"
              class="form-control"
              :value="statsPeriodStringified"
              @change="$store.commit('setStatsPeriod', $event.target.value)"
              placeholder="Enter a timeframe (ie: 1m)"
            />
          </div>
          <div class="form-group column__tight">
            <label
              class="checkbox-control -commodity-currency checkbox-control-input flex-right"
              v-tippy
              :title="help.statsCurrency"
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="statsCurrency"
                @change="
                  $store.commit('toggleStatsCurrency', $event.target.checked)
                "
              />
              <div></div>
            </label>
          </div>
        </div>
        <div
          class="settings__title"
          @click="$store.commit('toggleSettingsPanel', 'counters')"
          :class="{ closed: settings.indexOf('counters') > -1 }"
        >
          Counter <i class="icon-up"></i>
        </div>
        <div
          class="settings-counters settings__activable column"
          :class="{ active: showCounters }"
        >
          <div class="form-group column__tight">
            <label
              class="checkbox-control -on-off checkbox-control-input flex-right"
              v-tippy="{ placement: 'bottom' }"
              title="Enable counters"
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="showCounters"
                @change="$store.commit('toggleCounters', $event.target.checked)"
              />
              <div></div>
            </label>
          </div>
          <div class="form-group column__tight">
            <label
              class="checkbox-control -cml-abs checkbox-control-input flex-right"
              v-tippy
              :title="
                cumulativeCounters ? 'Cumulative mode' : 'Absolute mode'
              "
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="cumulativeCounters"
                @change="
                  $store.commit(
                    'toggleCumulativeCounters',
                    $event.target.checked
                  )
                "
              />
              <div></div>
            </label>
          </div>
          <div class="form-group column__fill">
            <input
              v-tippy
              title="Counters step separed by a comma (ie: 1m, 5m, 10m, 15m)"
              type="string"
              placeholder="Enter a set of timeframe (ie 1m, 15m)"
              class="form-control"
              :value="countersStepsStringified"
              @change="replaceCounters($event.target.value)"
            />
            <small class="mt8">Volume sum by time</small>
          </div>
        </div>
        <div
          class="settings__title"
          @click="$store.commit('toggleSettingsPanel', 'chart')"
          :class="{ closed: settings.indexOf('chart') > -1 }"
        >
          Chart <i class="icon-up"></i>
        </div>
        <div
          class="settings-chart settings__activable column"
          :class="{ active: showChart }"
        >
          <div class="form-group column__tight">
            <label
              class="checkbox-control -on-off checkbox-control-input flex-right"
              v-tippy="{ placement: 'bottom' }"
              title="Enable chart"
            >
              <input
                type="checkbox"
                class="form-control"
                :checked="showChart"
                @change="$store.commit('toggleChart', $event.target.checked)"
              />
              <div></div>
            </label>
          </div>
          <div class="column__fill">
            <div class="form-group mb8">
              <label
                class="checkbox-control flex-left"
                v-tippy
                title="Gridlines (horizontal tick lines)"
              >
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="chartGridlines"
                  @change="
                    $store.commit('toggleChartGridlines', $event.target.checked)
                  "
                />
                <div></div>
                <span @click.stop.prevent
                  >Horizontal ticks (every
                  <editable
                    :content="chartGridlinesGap"
                    @output="$store.commit('setChartGridlinesGap', $event)"
                  ></editable>
                  px)</span
                >
              </label>
            </div>
            <div class="form-group mb8">
              <label
                class="checkbox-control flex-left"
                v-tippy
                title="Pad chart"
              >
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="chartPadding"
                  @change="
                    $store.commit(
                      'setChartPadding',
                      $event.target.checked ? 0.05 : 0
                    )
                  "
                />
                <div></div>
                <span @click.stop.prevent
                  >Add
                  <editable
                    :content="(chartPadding * 100).toFixed(2)"
                    @output="
                      $store.commit('setChartPadding', ($event || 0) / 100)
                    "
                  ></editable>
                  % margin on the right</span
                >
              </label>
            </div>
            <div class="form-group mb8">
              <label
                class="checkbox-control flex-left"
                v-tippy
                title="Show price as candlestick instead of line"
              >
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="chartCandlestick"
                  @change="
                    $store.commit('toggleCandlestick', $event.target.checked)
                  "
                />
                <div></div>
                <span>Enable candlestick</span>
              </label>
            </div>
            <div class="form-group mb8">
              <label
                class="checkbox-control flex-left"
                v-tippy
                title="Show liquidation volume bars"
              >
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="chartLiquidations"
                  @change="
                    $store.commit('toggleLiquidations', $event.target.checked)
                  "
                />
                <div></div>
                <span>Liquidation bars</span>
              </label>
            </div>
            <div class="form-group mb8">
              <label
                class="checkbox-control flex-left"
                v-tippy
                title="Toggle Volume (buys / sells)"
              >
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="chartVolume"
                  @change="$store.commit('toggleVolume', $event.target.checked)"
                />
                <div></div>
                <span @click.stop.prevent>Volume</span>
              </label>
              <div v-if="chartVolume" class="settings-chart__sub-settings">
                <div>
                  only sum trades above <i class="icon-currency"></i>
                  <editable
                    :content="chartVolumeThreshold"
                    @output="$store.commit('setVolumeThreshold', $event)"
                  ></editable>
                </div>
                <div>
                  serie opacity
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step=".01"
                    :value="chartVolumeOpacity"
                    @change="
                      $store.commit('setVolumeOpacity', $event.target.value)
                    "
                  />
                </div>
              </div>
            </div>
            <div class="form-group mb8">
              <label
                class="checkbox-control flex-left"
                v-tippy
                title="Toggle Price Simple Moving Average"
              >
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="chartSma"
                  @change="$store.commit('toggleSma', $event.target.checked)"
                />
                <div></div>
                <span @click.stop.prevent>Price SMA</span>
              </label>
              <div v-if="chartSma" class="settings-chart__sub-settings">
                period
                <editable
                  :content="chartSmaLength"
                  @output="$store.commit('setSmaLength', $event)"
                ></editable>
              </div>
            </div>
            <div class="form-group mb8">
              <label
                class="checkbox-control flex-left"
                v-tippy
                title="Toggle Volume (buys / sells) Exponential Moving Average"
              >
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="chartVolumeAverage"
                  @change="
                    $store.commit('toggleVolumeAverage', $event.target.checked)
                  "
                />
                <div></div>
                <span @click.stop.prevent>Volume EMA</span>
              </label>
              <div
                v-if="chartVolumeAverage"
                class="settings-chart__sub-settings"
              >
                period
                <editable
                  :content="chartVolumeAverageLength"
                  @output="$store.commit('setVolumeAverageLength', $event)"
                ></editable>
              </div>
            </div>
            <div class="form-group mb8">
              <label
                class="checkbox-control flex-left"
                v-tippy
                title="Check this or RIP your computer"
              >
                <input
                  type="checkbox"
                  class="form-control"
                  :checked="autoClearTrades"
                  @change="
                    $store.commit(
                      'toggleAutoClearTrades',
                      $event.target.checked
                    )
                  "
                />
                <div></div>
                <span>Auto clean</span>
              </label>
            </div>
          </div>
        </div>
        <div
          class="settings__title"
          @click="$store.commit('toggleSettingsPanel', 'exchanges')"
          :class="{ closed: settings.indexOf('exchanges') > -1 }"
        >
          Exchanges <i class="icon-up"></i>
        </div>
        <div class="form-group">
          <div class="settings-exchanges">
            <Exchange
              v-for="(exchange, index) in exchanges"
              :key="index"
              :exchange="exchange"
            />
            <div v-if="!exchanges.length" class="mb8">
              You are not connected to any exchanges
            </div>
          </div>
        </div>
        <div class="mt15 column settings__footer flex-middle">
          <div class="form-group">
            <div v-if="version.number">
              <span>
                v{{ version.number }}
                <sup class="version-date">{{ version.date }}</sup>
              </span>
              <i class="divider">|</i>
              <a href="javascript:void(0);" @click="reset()"> reset</a>
              <i class="divider">|</i>
              <a
                target="_blank"
                href="https://github.com/Tucsky/SignificantTrades"
                title="Run your own instance !"
              >github</a>
              <i class="divider">|</i>
              <a
                target="_blank"
                href="https://tippin.me/@Tucsky"
                @click="openTippin"
                title="Bitcoin for more <3"
                v-tippy="{
                  animateFill: false,
                  interactive: true,
                  theme: 'blue',
                }"
              >donate</a
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import socket from '../services/socket'

import Exchange from './Exchange.vue'
import Thresholds from './Thresholds.vue'

export default {
  components: {
    Exchange,
    Thresholds,
  },
  data() {
    return {
      tippin: false,
      expanded: [],
      help: {
        statsCurrency: `Show stats in DOLLAR/CURRENCY value`,
      },
      version: {
        number: process.env.VERSION || 'DEV',
        date: process.env.BUILD_DATE || 'now',
      },
    }
  },
  computed: {
    ...mapState([
      'pair',
      'maxRows',
      'decimalPrecision',
      'showLogos',
      'liquidationsOnlyList',
      'showCounters',
      'showStats',
      'statsPeriod',
      'statsCurrency',
      'counterPrecision',
      'cumulativeCounters',
      'hideIncompleteCounter',
      'countersSteps',
      'showChart',
      'actives',
      'thresholds',
      'showThresholdsAsTable',
      'useAudio',
      'audioIncludeInsignificants',
      'audioVolume',
      'timeframe',
      'chartLiquidations',
      'chartPadding',
      'chartGridlines',
      'chartGridlinesGap',
      'chartCandlestick',
      'chartSma',
      'chartSmaLength',
      'chartVolume',
      'chartVolumeThreshold',
      'chartVolumeOpacity',
      'chartVolumeAverage',
      'chartVolumeAverageLength',
      'autoClearTrades',
      'settings',
    ]),
    exchanges: () => {
      return socket.exchanges
    },
    showPairSubdomainHelp: (state) => {
      if (!state.$root.isAggrTrade || !state.pair) {
        return false
      }

      const match = window.location.hostname.match(/^([\d\w]+)\..*\./i)

      return (
        !match ||
        match.length < 2 ||
        match[1].toLowerCase() !== state.pair.toLowerCase()
      )
    },
  },
  created() {
    this.stringifyCounters()
    this.stringifyStatsPeriod()
  },
  beforeDestroy() {
    document.removeEventListener('click', this._closeTippinHandler)
  },
  methods: {
    stringifyStatsPeriod() {
      this.statsPeriodStringified = this.$root.ago(
        +new Date() - this.statsPeriod
      )
    },
    stringifyCounters() {
      const now = +new Date()
      this.countersStepsStringified = this.countersSteps
        .map((a) => this.$root.ago(now - a))
        .join(', ')
    },
    replaceCounters(value) {
      const counters = value
        .split(',')
        .map((a) => {
          a = a.trim()

          if (/[\d.]+s/.test(a)) {
            return parseFloat(a) * 1000
          } else if (/[\d.]+h/.test(a)) {
            return parseFloat(a) * 1000 * 60 * 60
          } else {
            return parseFloat(a) * 1000 * 60
          }
        })
        .filter(function(item, pos, self) {
          return self.indexOf(item) == pos
        })

      if (counters.filter((a) => isNaN(a)).length) {
        socket.$emit('alert', {
          type: 'error',
          title: `Invalid counter`,
          message: `Your counters (${value}) contains invalid steps.`,
          id: `counter_replace_error`,
        })
        return
      }

      this.$store.commit('replaceCounterSteps', counters)

      this.stringifyCounters()
      this.stringifyStatsPeriod()
    },
    reset() {
      window.localStorage && window.localStorage.clear()

      window.location.reload(true)
    },
    openTippin(e) {
      e.preventDefault()

      this.tippin = true

      this._closeTippinHandlerTimeout = setTimeout(() => {
        this._closeTippinHandler = this.closeTippin.bind(this)

        document.addEventListener('click', this._closeTippinHandler)
      })
    },
    closeTippin(e) {
      e.preventDefault()

      clearTimeout(this._closeTippinHandlerTimeout)

      if (!document.querySelector('.tippin-me').contains(e.target)) {
        this.tippin = false

        document.removeEventListener('click', this._closeTippinHandler)

        e.stopPropagation()
      }
    },
  },
}
</script>

<style lang="scss">
@import '../assets/sass/variables';

.settings__report {
  display: block;
  padding: 7px 6px 6px;
  background-color: $red;
}

.settings__container {
  background: none !important;
  color: white;

  .stack__scroller {
    background-color: $dark;
  }

  @media screen and (min-width: 500px) {
    z-index: 2;
    position: fixed;
    height: 100%;
    width: 100%;

    + .app__wrapper {
      transform: translateX(320px);
    }

    .stack__scroller {
      width: 320px;
      height: 100%;
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

    .help-text {
      color: rgba(white, 0.6);

      a {
        text-decoration: underline;
      }
    }

    label + .help-text {
      margin: -0.5em 0 0.5em;
    }

    .form-control {
      padding: 8px 8px;
      background-color: white;
      border-radius: 2px;
      border: 0;
      width: calc(100% - 16px);
      letter-spacing: -0.5px;
      min-width: 0;
      font-size: 1em;
      margin: 0;
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
      margin-right: auto;

      + .settings-chart__sub-settings {
        position: relative;

        &:before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: -1.5em;
          width: 2px;
          background-color: rgba(white, 0.2);
        }
      }

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
        background-color: rgba(white, 0.2);
        transition: all 0.2s $easeOutExpo;
        position: relative;
        flex-shrink: 0;

        &:before,
        &:after {
          font-family: 'icon';
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
          pointer-events: none;
        }

        &:not([class^='icon-']):before {
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
          padding: 0.8em;
        }
      }

      &.-luminosity {
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

      &.-on-off input ~ div {
        &:before {
          content: unicode($icon-power-on);
        }

        &:after {
          content: unicode($icon-power-off);
        }
      }

      &.-commodity-currency input ~ div {
        &:before {
          content: unicode($icon-dollar);
        }

        &:after {
          content: unicode($icon-btc);
        }
      }

      &.-cml-abs input {
        ~ div {
          &:before,
          &:after {
            font-family: inherit;
          }

          &:before {
            content: 'CML';
          }

          &:after {
            content: 'ABS';
          }
        }

        &:not(:checked) ~ div {
          background-color: $blue;
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
        margin-bottom: 0;
      }
    }
  }

  input[type='range'] {
    -webkit-appearance: none; /* Override default CSS styles */
    appearance: none;
    height: 2.5em; /* Specified height */
    background: rgba(black, 0.5); /* Grey background */
    outline: none; /* Remove outline */
    opacity: 0.7; /* Set transparency (for mouse-over effects on hover) */
    -webkit-transition: 0.2s; /* 0.2 seconds transition on hover */
    transition: opacity 0.2s;
    cursor: ew-resize;
    margin: 0;
    width: auto;

    &::-webkit-slider-thumb {
      -webkit-appearance: none; /* Override default look */
      appearance: none;
      width: 0.5em; /* Set a specific slider handle width */
      height: 2em; /* Slider handle height */
      background: lighten($green, 20%); /* Green background */
      cursor: ew-resize;
    }

    &::-moz-range-thumb {
      width: 0.5em; /* Set a specific slider handle width */
      height: 2em; /* Slider handle height */
      background: lighten($green, 20%); /* Green background */
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

  .column {
    display: flex;
    flex-direction: row;

    > .column__tight {
      flex-basis: auto;
      flex-grow: 0;

      label {
        white-space: nowrap;
      }
    }

    > .column__fill {
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
    display: flex;
    align-items: center;
    padding: 0.5em 0;
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
      margin-left: 0.5em;
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

  .settings-audio {
    align-items: center;
    padding-bottom: 8px;

    label {
      margin: 0;
    }

    input[type='range'] {
      width: 100%;
      margin: 0;
    }
  }

  .settings-thresholds {
    position: relative;

    &__display-toggle {
      position: absolute;
      right: 0;
      top: -1.75em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.5;

      &:hover {
        opacity: 1;
      }
    }
  }

  .settings-exchanges {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  &.open {
    background-color: #222;
  }

  .settings-chart {
    &__sub-settings {
      margin-left: 2.4em;
      margin-bottom: 0.5em;

      > div {
        + div {
          margin-top: 0.75em;
        }
      }

      > div + div {
        margin-top: 0.75em;
      }

      input[type='range'] {
        font-size: 0.5em;
        vertical-align: middle;
      }
    }
  }
}

.tippin-me {
  position: fixed;
  z-index: 10000;
  width: 280px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2), 0 0 20px rgba(0, 0, 0, 0.1);
  border: 2em solid white;
  height: 470px;
  animation: 0.33s $easeElastic tippin-in;

  @keyframes tippin-in {
    from {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0.1;
    }
    to {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  iframe {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
  }
}
</style>
