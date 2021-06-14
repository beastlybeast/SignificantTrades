<template>
  <div id="trades" :class="{ '-logos': this.showLogos, '-slippage': this.showSlippage }">
    <ul ref="tradesContainer"></ul>
    <div v-if="!tradesCount" class="trade -empty">Nothing to show, yet.</div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { ago, formatPrice, formatAmount } from '../utils/helpers'
import { getColorByWeight, getColorLuminance, getAppBackgroundColor, splitRgba, getLogShade } from '../utils/colors'

import socket from '../services/socket'
import Sfx from '../services/sfx'

let LAST_TRADE_TIMESTAMP // to control whether we show timestamp on trade or not
let LAST_SIDE // to control wheter we show "up" or "down" icon in front of trade
let MINIMUM_AMOUNT // alias threshold[0].amount
let SIGNIFICANT_AMOUNT // alias threshold[1].amount
let COLORS // prepared array of buy / sell colors ranges
let GIFS // gifs from storages, by threshold gif keyword

let activeExchanges = []

export default {
  data() {
    return {
      tradesCount: 0
    }
  },
  computed: {
    ...mapState('settings', [
      'pair',
      'maxRows',
      'thresholds',
      'exchanges',
      'useAudio',
      'showSlippage',
      'liquidationsOnly',
      'audioIncludeInsignificants',
      'preferQuoteCurrencySize',
      'decimalPrecision',
      'showLogos'
    ]),
    ...mapState('app', ['actives'])
  },
  created() {
    // cache list of active exchange
    activeExchanges = this.$store.state.app.actives.slice(0, this.$store.state.app.actives.length)

    this.retrieveStoredGifs()
    this.prepareColorsSteps()

    socket.$on('trades.aggr', this.onTrades)

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'app/EXCHANGE_UPDATED':
          activeExchanges = state.app.actives.slice(0, state.app.actives.length)
          break
        case 'settings/SET_PAIR':
          this.clearList()
          break
        case 'settings/TOGGLE_AUDIO':
          if (mutation.payload) {
            this.sfx = new Sfx()
          } else {
            this.sfx && this.sfx.disconnect() && delete this.sfx
          }
          break
        case 'settings/SET_THRESHOLD_GIF':
          this.fetchGifByKeyword(mutation.payload.value, mutation.payload.isDeleted)
          break
        case 'settings/SET_THRESHOLD_COLOR':
        case 'settings/SET_THRESHOLD_AMOUNT':
        case 'settings/DELETE_THRESHOLD':
        case 'settings/ADD_THRESHOLD':
          this.prepareColorsSteps()
          break
      }
    })
  },
  mounted() {
    if (this.useAudio) {
      this.sfx = new Sfx()

      if (this.sfx.context.state === 'suspended') {
        const resumeOnFocus = (() => {
          if (this.useAudio) {
            this.sfx.context.resume()
          }

          if (!this.useAudio || this.sfx.context.state !== 'suspended') {
            window.removeEventListener('focus', resumeOnFocus, false)
            window.removeEventListener('blur', resumeOnFocus, false)
          }
        }).bind(this)

        window.addEventListener('blur', resumeOnFocus, false)
        window.addEventListener('focus', resumeOnFocus, false)
      }
    }

    this._timeAgoInterval = setInterval(() => {
      const elements = this.$el.getElementsByClassName('-timestamp')

      if (!elements.length) {
        return
      }

      let ref

      for (let i = 0; i < elements.length; i++) {
        const txt = ago(elements[i].getAttribute('timestamp'))

        if (typeof ref !== 'undefined' && ref === txt) {
          elements[i].textContent = ''
          elements[i].className = 'trade__date'
          i++
          continue
        }

        if (txt !== elements[i].textContent) {
          elements[i].textContent = txt
        }

        ref = txt
      }
    }, 1000)
  },
  beforeDestroy() {
    socket.$off('trades.aggr', this.onTrades)

    this.onStoreMutation()

    clearInterval(this._timeAgoInterval)

    this.sfx && this.sfx.disconnect()
  },
  methods: {
    onTrades(trades) {
      for (let i = 0; i < trades.length; i++) {
        if (activeExchanges.indexOf(trades[i].exchange) === -1) {
          continue
        }

        const trade = trades[i]
        const amount = trade.size * (this.preferQuoteCurrencySize ? trade.price : 1)
        const multiplier = typeof this.exchanges[trade.exchange].threshold !== 'undefined' ? +this.exchanges[trade.exchange].threshold : 1

        if (trade.liquidation) {
          if (this.useAudio && amount > SIGNIFICANT_AMOUNT * multiplier * 0.1) {
            this.sfx.liquidation((amount / SIGNIFICANT_AMOUNT) * multiplier)
          }

          if (amount >= MINIMUM_AMOUNT * multiplier) {
            let liquidationMessage = `<i class="icon-currency"></i> <strong>${formatAmount(amount, 1)}</strong>`

            liquidationMessage += `&nbsp;liq<span class="min-280">uidate</span>d <strong>${
              trade.side === 'buy' ? 'SHORT' : 'LONG'
            }</strong> @ <i class="icon-quote"></i> ${formatPrice(trade.price)}`

            this.appendRow(trade, amount, multiplier, '-liquidation', liquidationMessage)
          }
          continue
        } else if (this.liquidationsOnly) {
          continue
        }

        if (amount >= MINIMUM_AMOUNT * multiplier) {
          this.appendRow(trade, amount, multiplier)
        } else {
          if (this.useAudio && this.audioIncludeInsignificants && amount >= SIGNIFICANT_AMOUNT * 0.1) {
            this.sfx.tradeToSong(amount / (SIGNIFICANT_AMOUNT * multiplier), trade.side, 0)
          }
        }
      }
    },
    appendRow(trade, amount, multiplier = 1, classname = '', message = null) {
      if (!this.tradesCount) {
        this.$forceUpdate()
      }

      this.tradesCount++

      const li = document.createElement('li')
      li.className = ('trade ' + classname).trim()
      li.className += ' -' + trade.exchange

      li.className += ' -' + trade.side

      if (trade.exchange.length > 10) {
        li.className += ' -sm'
      }

      if (amount >= SIGNIFICANT_AMOUNT * multiplier) {
        li.className += ' -significant'
      }

      for (let i = 0; i < this.thresholds.length; i++) {
        li.className += ' -level-' + i

        if (!this.thresholds[i + 1] || amount < this.thresholds[i + 1].amount * multiplier) {
          // THIS IS OUR THRESHOLD
          const color = COLORS[Math.min(this.thresholds.length - 2, i)]
          const threshold = this.thresholds[i]

          if (threshold.gif && GIFS[threshold.gif]) {
            // get random gif for this threshold
            li.style.backgroundImage = `url('${GIFS[threshold.gif][Math.floor(Math.random() * (GIFS[threshold.gif].length - 1))]}`
          }

          // percentage to next threshold
          const percentToNextThreshold = (Math.max(amount, color.threshold) - color.threshold) / color.range

          // 0-255 luminance of nearest color
          const luminance = color[trade.side][(percentToNextThreshold < 0.5 ? 'from' : 'to') + 'Luminance']

          // background color simple color to color based on percentage of amount to next threshold
          const backgroundColor = getColorByWeight(color[trade.side].from, color[trade.side].to, percentToNextThreshold)
          li.style.backgroundColor = 'rgb(' + backgroundColor[0] + ', ' + backgroundColor[1] + ', ' + backgroundColor[2] + ')'

          if (i >= 1) {
            // ajusted amount > SIGNIFICANT_AMOUNT
            // only pure black or pure white foreground
            li.style.color = luminance < 175 ? 'white' : 'black'
          } else {
            // take background color and apply logarithmic shade based on amount to SIGNIFICANT_AMOUNT percentage
            // darken if luminance of background is high, lighten otherwise
            li.style.color = getLogShade(backgroundColor, Math.max(0.25, Math.min(1, amount / SIGNIFICANT_AMOUNT)) * (luminance < 175 ? 1 : -1))
          }

          if (this.useAudio && amount >= (this.audioIncludeInsignificants ? SIGNIFICANT_AMOUNT * 0.1 : MINIMUM_AMOUNT * 1) * multiplier) {
            this.sfx.tradeToSong(amount / (SIGNIFICANT_AMOUNT * multiplier), trade.side, i)
          }

          break
        }
      }

      if (!message) {
        if (trade.side !== LAST_SIDE) {
          const side = document.createElement('div')
          side.className = 'trade__side icon-side'
          li.appendChild(side)
        }

        LAST_SIDE = trade.side
      }

      const exchange = document.createElement('div')
      exchange.className = 'trade__exchange'
      exchange.innerText = trade.exchange.replace('_', ' ')
      exchange.setAttribute('title', trade.exchange)
      li.appendChild(exchange)

      if (message) {
        const message_div = document.createElement('div')
        message_div.className = 'trade__message'
        message_div.innerHTML = message
        li.appendChild(message_div)
      } else {
        const price = document.createElement('div')
        price.className = 'trade__price'
        price.innerHTML = `<span class="icon-quote"></span> <span>${formatPrice(trade.price)}</span>`
        li.appendChild(price)

        if (this.showSlippage === 'price' && trade.slippage / trade.price > 0.0001) {
          price.setAttribute(
            'slippage',
            (trade.slippage > 0 ? '+' : '-') + document.getElementById('app').getAttribute('data-symbol') + Math.abs(trade.slippage).toFixed(1)
          )
        } else if (this.showSlippage === 'bps' && trade.slippage) {
          price.setAttribute('slippage', (trade.slippage > 0 ? '+' : '-') + trade.slippage)
        }

        const amount_div = document.createElement('div')
        amount_div.className = 'trade__amount'

        const amount_quote = document.createElement('span')
        amount_quote.className = 'trade__amount__quote'
        amount_quote.innerHTML = `<span class="icon-quote"></span> <span>${formatAmount(trade.price * trade.size)}</span>`

        const amount_base = document.createElement('span')
        amount_base.className = 'trade__amount__base'
        amount_base.innerHTML = `<span class="icon-base"></span> <span>${formatAmount(trade.size)}</span>`

        amount_div.appendChild(amount_quote)
        amount_div.appendChild(amount_base)
        li.appendChild(amount_div)
      }

      const date = document.createElement('div')
      date.className = 'trade__date'

      let timestamp = Math.floor(trade.timestamp / 1000) * 1000

      if (timestamp !== LAST_TRADE_TIMESTAMP) {
        LAST_TRADE_TIMESTAMP = timestamp

        date.setAttribute('timestamp', trade.timestamp)
        date.innerText = ago(timestamp)

        date.className += ' -timestamp'
      }

      li.appendChild(date)

      this.$refs.tradesContainer.appendChild(li)

      while (this.tradesCount > this.maxRows) {
        this.tradesCount--
        this.$refs.tradesContainer.removeChild(this.$refs.tradesContainer.firstChild)
      }
    },
    retrieveStoredGifs(refresh) {
      GIFS = {}

      this.thresholds.forEach(threshold => {
        if (!threshold.gif) {
          return
        }

        const slug = this.slug(threshold.gif)
        const storage = localStorage ? JSON.parse(localStorage.getItem('threshold_' + slug + '_gifs')) : null

        if (!refresh && storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7) {
          GIFS[threshold.gif] = storage.data
        } else {
          this.fetchGifByKeyword(threshold.gif)
        }
      })
    },
    fetchGifByKeyword(keyword, isDeleted = false) {
      if (!keyword || !GIFS) {
        return
      }

      const slug = this.slug(keyword)

      if (isDeleted) {
        if (GIFS[keyword]) {
          delete GIFS[keyword]
        }

        localStorage.removeItem('threshold_' + slug + '_gifs')

        return
      }

      fetch('https://api.giphy.com/v1/gifs/search?q=' + keyword + '&rating=r&limit=100&api_key=b5Y5CZcpj9spa0xEfskQxGGnhChYt3hi')
        .then(res => res.json())
        .then(res => {
          if (!res.data || !res.data.length) {
            return
          }

          GIFS[keyword] = []

          for (let item of res.data) {
            GIFS[keyword].push(item.images.original.url)
          }

          localStorage.setItem(
            'threshold_' + slug + '_gifs',
            JSON.stringify({
              timestamp: +new Date(),
              data: GIFS[keyword]
            })
          )
        })
    },
    slug(keyword) {
      return keyword
        .toLowerCase()
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '-')
    },
    prepareColorsSteps() {
      const appBackgroundColor = getAppBackgroundColor()

      COLORS = []
      MINIMUM_AMOUNT = this.thresholds[0].amount
      SIGNIFICANT_AMOUNT = this.thresholds[1].amount

      for (let i = 0; i < this.thresholds.length - 1; i++) {
        const buyFrom = splitRgba(this.thresholds[i].buyColor, appBackgroundColor)
        const buyTo = splitRgba(this.thresholds[i + 1].buyColor, appBackgroundColor)
        const sellFrom = splitRgba(this.thresholds[i].sellColor, appBackgroundColor)
        const sellTo = splitRgba(this.thresholds[i + 1].sellColor, appBackgroundColor)

        COLORS.push({
          threshold: this.thresholds[i].amount,
          range: this.thresholds[i + 1].amount - this.thresholds[i].amount,
          buy: {
            from: buyFrom,
            to: buyTo,
            fromLuminance: getColorLuminance(buyFrom),
            toLuminance: getColorLuminance(buyTo)
          },
          sell: {
            from: sellFrom,
            to: sellTo,
            fromLuminance: getColorLuminance(sellFrom),
            toLuminance: getColorLuminance(sellTo)
          }
        })
      }
    },

    clearList() {
      this.$refs.tradesContainer.innerHTML = ''
      this.tradesCount = 0
    }
  }
}
</script>

<style lang="scss">
@keyframes highlight {
  0% {
    opacity: 0.75;
  }

  100% {
    opacity: 0;
  }
}

#trades {
  background-color: rgba(black, 0.2);
  line-height: 1;

  ul {
    margin: 0;
    padding: 0;
    display: flex;
    flex-flow: column-reverse nowrap;
  }

  &.-slippage {
    .trade__price {
      flex-grow: 1.5;
    }
  }

  &.-logos {
    .trade__exchange {
      text-indent: -9999px;
      flex-basis: 0;
      flex-grow: 0.4;
    }

    @each $exchange in $exchanges {
      .-#{$exchange} .trade__exchange {
        background-image: url('../assets/exchanges/#{$exchange}.svg');
      }
    }

    .-liquidation {
      .trade__exchange {
        position: absolute;
        width: 1em;
      }
    }
  }

  &:not(.-logos) .trade.-sm {
    .trade__exchange {
      font-size: 0.75em;
      letter-spacing: -0.5px;
      margin-top: -5px;
      margin-bottom: -5px;
      white-space: normal;
      word-break: break-word;
      line-height: 0.9;
    }

    &.-liquidation .trade__exchange {
      max-width: 4em;
    }
  }
}

.trade {
  display: flex;
  flex-flow: row nowrap;
  padding: 0.4em 0.6em;
  background-position: center center;
  background-size: cover;
  background-blend-mode: overlay;
  position: relative;
  align-items: center;

  &:after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0;
    background-color: white;
    animation: 1s $easeOutExpo highlight;
    pointer-events: none;
  }

  &.-empty {
    justify-content: center;
    padding: 20px;
    font-size: 0.8rem;

    &:after {
      display: none;
    }
  }

  &.-sell {
    background-blend-mode: soft-light;
    background-color: lighten($red, 35%);
    color: $red;

    .icon-side:before {
      content: unicode($icon-down);
    }
  }

  &.-buy {
    background-color: lighten($green, 50%);
    color: $green;

    .icon-side:before {
      content: unicode($icon-up);
    }
  }

  &.-level-1 {
    color: white;
  }

  &.-level-2 {
    padding: 0.5em 0.6em;
  }

  &.-level-3 {
    box-shadow: 0 0 20px rgba(red, 0.5);
    z-index: 1;
  }

  > div {
    flex-grow: 1;
    flex-basis: 0;
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .trade__side {
    flex-grow: 0;
    flex-basis: 1em;
    font-size: 1em;
    position: absolute;

    + .trade__message {
      margin-left: 0.5em;
    }
  }

  .icon-currency,
  .icon-quote,
  .icon-base {
    line-height: 0;
  }

  .trade__exchange {
    background-repeat: no-repeat;
    background-position: center center;
    flex-grow: 0.75;
    margin-left: 5%;

    small {
      opacity: 0.8;
    }
  }

  &.-liquidation {
    background-color: $pink !important;
    color: white !important;

    .trade__exchange {
      flex-grow: 0;
      flex-basis: auto;
      margin-left: 0;
    }
  }

  .trade__price:after {
    content: attr(slippage);
    font-size: 80%;
    position: relative;
    top: -2px;
    left: 2px;
    opacity: 0.75;
  }

  .trade__amount {
    flex-grow: 1;
    position: relative;

    > span {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      transition: all 0.1s ease-in-out;
      display: block;

      &.trade__amount__quote {
        position: absolute;
      }

      &.trade__amount__base {
        transform: translateX(25%);
        opacity: 0;
      }
    }

    &:hover {
      > span.trade__amount__base {
        transform: none;
        opacity: 1;
      }

      > span.trade__amount__quote {
        transform: translateX(-25%);
        opacity: 0;
      }
    }
  }

  .trade__date {
    text-align: right;
    flex-basis: 2em;
    flex-grow: 0;
  }

  .trade__message {
    flex-grow: 2;
    text-align: center;
    font-size: 90%;
    line-height: 1.5;

    + .trade__date {
      overflow: visible;
      flex-basis: auto;
      font-size: 0.8em;
      margin-left: -0.2em;
    }
  }
}

#app[data-prefer='base'] .trade .trade__amount {
  .trade__amount__quote {
    transform: translateX(-25%);
    opacity: 0;
  }

  .trade__amount__base {
    transform: none;
    opacity: 1;
  }

  &:hover {
    > span.trade__amount__base {
      transform: translateX(25%);
      opacity: 0;
    }

    > span.trade__amount__quote {
      transform: none;
      opacity: 1;
    }
  }
}
</style>
