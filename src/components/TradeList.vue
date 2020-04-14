<template>
  <div id="trades" :class="{ '-logos': this.showLogos }">
    <ul ref="tradesContainer"></ul>
    <div v-if="!tradesCount" class="trade -empty">Nothing to show, yet.</div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { ago, formatPrice, formatAmount } from '../utils/helpers'

import socket from '../services/socket'
import Sfx from '../services/sfx'

let LAST_TRADE_TIMESTAMP

export default {
  data() {
    return {
      gifs: {},
      tradesCount: 0,
      lastSide: null
    }
  },
  computed: {
    ...mapState([
      'actives',
      'pair',
      'maxRows',
      'thresholds',
      'exchanges',
      'useAudio',
      'audioIncludeInsignificants',
      'preferQuoteCurrencySize',
      'decimalPrecision',
      'showLogos'
    ])
  },
  created() {
    this.retrieveStoredGifs()
    this.retrieveColorSteps()

    socket.$on('pairing', this.onPairing)
    socket.$on('trades.aggr', this.onTrades)

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'toggleAudio':
          if (mutation.payload) {
            this.sfx = new Sfx()
          } else {
            this.sfx && this.sfx.disconnect() && delete this.sfx
          }
          break
        case 'setThresholdGif':
          this.fetchGifByKeyword(mutation.payload.value, mutation.payload.isDeleted)
          break
        case 'setThresholdColor':
        case 'setThresholdAmount':
          this.retrieveColorSteps()
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

    this.timeAgoInterval = setInterval(() => {
      for (let element of this.$el.querySelectorAll('[timestamp]')) {
        element.innerHTML = ago(element.getAttribute('timestamp'))
      }
    }, 1000)
  },
  beforeDestroy() {
    socket.$off('pairing', this.onPairing)
    socket.$off('trades.aggr', this.onTrades)

    this.onStoreMutation()

    clearInterval(this.timeAgoInterval)

    this.sfx && this.sfx.disconnect()
  },
  methods: {
    onPairing() {
      this.clearList()
    },
    onTrades(trades, silent = false) {
      for (let i = 0; i < trades.length; i++) {
        const trade = trades[i]
        const size = trade.size * (this.preferQuoteCurrencySize ? trade.price : 1)

        const multiplier = typeof this.exchanges[trade.exchange].threshold !== 'undefined' ? +this.exchanges[trade.exchange].threshold : 1

        if (trade.liquidation) {
          if (
            !silent &&
            this.useAudio &&
            ((this.audioIncludeInsignificants && size > this.thresholds[1].amount * Math.max(0.1, multiplier) * 0.1) ||
              size > this.thresholds[1].amount * Math.max(0.1, multiplier))
          ) {
            this.sfx.liquidation(size / this.thresholds[0].amount)
          }

          if (size >= this.thresholds[0].amount * multiplier) {
            let liquidationMessage = `<i class="icon-currency"></i> <strong>${formatAmount(size, 1)}</strong>`

            liquidationMessage += `&nbsp;liq<span class="min-280">uidate</span>d <strong>${
              trade.side === 'sell' ? 'SHORT' : 'LONG'
            }</strong> @ <i class="icon-currency"></i> ${formatPrice(trade.price)}`

            this.appendRow(trade, '-liquidation', liquidationMessage)
          }
          return
        }

        if (
          !silent &&
          this.useAudio &&
          ((this.audioIncludeInsignificants && size > this.thresholds[1].amount * Math.max(0.1, multiplier) * 0.1) ||
            size > this.thresholds[1].amount * Math.max(0.1, multiplier))
        ) {
          this.sfx && this.sfx.tradeToSong(size / (this.thresholds[1].amount * Math.max(0.1, multiplier)), trade.side)
        }

        if (size >= this.thresholds[0].amount * multiplier) {
          this.appendRow(trade, null, null)
        }
      }
    },
    appendRow(trade, classname = '', message = null) {
      if (!this.tradesCount) {
        this.$forceUpdate()
      }

      this.tradesCount++

      const multiplier =
        this.exchanges[trade.exchange] && typeof this.exchanges[trade.exchange].threshold !== 'undefined'
          ? +this.exchanges[trade.exchange].threshold
          : 1

      let amount = trade.size * (this.preferQuoteCurrencySize ? trade.price : 1)

      const li = document.createElement('li')
      li.className = ('trade ' + classname).trim()
      li.className += ' -' + trade.exchange

      li.className += ' -' + trade.side

      if (trade.exchange.length > 10) {
        li.className += ' -sm'
      }

      if (amount >= this.thresholds[1].amount * multiplier) {
        li.className += ' -significant'
      }

      let color = this.getTradeColor(trade, multiplier)

      if (color.background) {
        li.style.backgroundColor = color.background
      }
      if (color.foreground) {
        li.style.color = color.foreground
      }

      let image

      for (let i = 0; i < this.thresholds.length; i++) {
        if (amount < this.thresholds[i].amount * multiplier) {
          break
        }

        if (this.thresholds[i].gif && this.gifs[this.thresholds[i].gif]) {
          li.style.backgroundImage = `url('${
            this.gifs[this.thresholds[i].gif][Math.floor(Math.random() * (this.gifs[this.thresholds[i].gif].length - 1))]
          }`
          li.className += ' -gif'
        }

        li.className += ' level-' + i
      }

      amount = formatAmount(trade.price * trade.size)

      if (!message) {
        if (trade.side !== this.lastSide) {
          const side = document.createElement('div')
          side.className = 'trade__side icon-side'
          li.appendChild(side)
        }

        this.lastSide = trade.side
      }

      const exchange = document.createElement('div')
      exchange.className = 'trade__exchange'
      exchange.innerText = trade.exchange.replace('_', ' ')
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

        if (trade.slippage) {
          price.setAttribute('slippage', (trade.slippage > 0 ? '+' : '-') + app.getAttribute('data-symbol') + Math.abs(trade.slippage).toFixed(1))
        }

        const amount_div = document.createElement('div')
        amount_div.className = 'trade__amount'

        const amount_quote = document.createElement('span')
        amount_quote.className = 'trade__amount__quote'
        amount_quote.innerHTML = `<span class="icon-quote"></span> <span>${amount}</span>`

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
      }

      li.appendChild(date)
      li.setAttribute('data-trade', JSON.stringify(trade));
      li.addEventListener('click', (event) => {
        console.log(JSON.parse(event.currentTarget.getAttribute('data-trade')));
      })

      this.$refs.tradesContainer.appendChild(li)

      while (this.tradesCount > this.maxRows) {
        this.tradesCount--
        this.$refs.tradesContainer.removeChild(this.$refs.tradesContainer.firstChild)
      }
    },
    retrieveStoredGifs(refresh) {
      this.thresholds.forEach(threshold => {
        if (!threshold.gif) {
          return
        }

        const slug = this.slug(threshold.gif)
        const storage = localStorage ? JSON.parse(localStorage.getItem('threshold_' + slug + '_gifs')) : null

        if (!refresh && storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7) {
          this.gifs[threshold.gif] = storage.data
        } else {
          this.fetchGifByKeyword(threshold.gif)
        }
      })
    },
    fetchGifByKeyword(keyword, isDeleted = false) {
      if (!keyword) {
        return
      }

      const slug = this.slug(keyword)

      if (isDeleted) {
        if (this.gifs[keyword]) {
          delete this.gifs[keyword]
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

          this.gifs[keyword] = []

          for (let item of res.data) {
            this.gifs[keyword].push(item.images.original.url)
          }

          localStorage.setItem(
            'threshold_' + slug + '_gifs',
            JSON.stringify({
              timestamp: +new Date(),
              data: this.gifs[keyword]
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
    formatRgba(string) {
      const match = string.match(/rgba?\((\d+)[\s\,]*(\d+)[\s\,]*(\d+)(?:[\s\,]*([\d\.]+))?\)/)

      return {
        r: +match[1],
        g: +match[2],
        b: +match[3],
        a: typeof match[4] === 'undefined' ? 1 : +match[4]
      }
    },
    retrieveColorSteps() {
      let uniqueThresholds = []
      let amounts = []

      for (let i = this.thresholds.length - 1; i >= 0; i--) {
        if (amounts.indexOf(+this.thresholds[i].amount) === -1) {
          uniqueThresholds.unshift(this.thresholds[i])
          amounts.push(+this.thresholds[i].amount)
        }
      }

      const maximum = uniqueThresholds[uniqueThresholds.length - 1].amount

      this.colors = {}

      this.colors.buys = uniqueThresholds.map((threshold, index) => ({
        pct: threshold.amount / maximum,
        color: this.formatRgba(threshold.buyColor)
      }))

      this.colors.sells = uniqueThresholds.map((threshold, index) => ({
        pct: threshold.amount / maximum,
        color: this.formatRgba(threshold.sellColor)
      }))
    },
    shadeRGBColor(color, percent) {
      var f = color.split(','),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = parseInt(f[0].slice(4)),
        G = parseInt(f[1]),
        B = parseInt(f[2])
      return 'rgb(' + (Math.round((t - R) * p) + R) + ',' + (Math.round((t - G) * p) + G) + ',' + (Math.round((t - B) * p) + B) + ')'
    },
    getTradeColor(trade, multiplier = 1) {
      const amount = trade.size * (this.preferQuoteCurrencySize ? trade.price : 1)
      const pct = amount / (this.thresholds[this.thresholds.length - 1].amount * multiplier)
      const palette = this.colors[trade.side + 's']

      for (var i = 1; i < palette.length - 1; i++) {
        if (pct < palette[i].pct) {
          break
        }
      }

      const lower = palette[i - 1]
      const upper = palette[i]
      const range = upper.pct - lower.pct
      let rangePct = (pct - lower.pct) / range
      let pctLower = 1 - rangePct
      const pctUpper = rangePct

      const backgroundRGB = {
        r: Math.floor(lower.color.r * pctLower + upper.color.r * rangePct),
        g: Math.floor(lower.color.g * pctLower + upper.color.g * rangePct),
        b: Math.floor(lower.color.b * pctLower + upper.color.b * rangePct),
        a: lower.color.a * pctLower + upper.color.a * rangePct
      }

      const background = `rgba(${backgroundRGB.r}, ${backgroundRGB.g}, ${backgroundRGB.b}, ${backgroundRGB.a})`
      const luminance = Math.sqrt(0.299 * Math.pow(backgroundRGB.r, 2) + 0.587 * Math.pow(backgroundRGB.g, 2) + 0.114 * Math.pow(backgroundRGB.b, 2))
      const ajustedLuminance = luminance * backgroundRGB.a

      let foreground

      if (backgroundRGB.a === 1 && luminance < 200) {
        foreground = 'white'
      } else if (luminance > 200) {
        foreground = 'black'
      } else if (luminance < 10) {
        foreground = 'white'
      } else {
        rangePct *= 3 * ((200 - ajustedLuminance) / 200)

        foreground = this.shadeRGBColor(`rgb(${backgroundRGB.r}, ${backgroundRGB.g}, ${backgroundRGB.b})`, Math.max(0.25, rangePct))
      }

      return {
        background,
        foreground
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
@import '../assets/sass/variables';

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

  &.-logos {
    .trade__exchange {
      text-indent: -9999px;
      flex-basis: 3em;
      flex-grow: 0;
      min-width: 1em;
    }

    @each $exchange in $exchanges {
      .-#{$exchange} .trade__exchange {
        background-image: url('/static/exchanges/#{$exchange}.svg');
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

    > div {
      position: relative;
    }

    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      background-color: rgba(black, 0.2);
    }
  }

  &.-level-3 {
    box-shadow: 0 0 20px rgba(red, 0.5);
    z-index: 1;
  }

  &.-gif {
    > div {
      position: relative;
    }

    &:before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: black;
      opacity: 0.2;
    }
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
    line-height: 1.06;

    + .trade__message {
      margin-left: 0.5em;
    }
  }

  .trade__exchange {
    background-repeat: no-repeat;
    background-position: center center;
    flex-grow: 0.75;

    small {
      opacity: 0.8;
    }

    &:first-child {
      margin-left: 1em;
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
    flex-grow: .66;
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
    flex-basis: 2.5em;
    flex-grow: 0;
  }

  .trade__message {
    flex-grow: 2;
    text-align: center;
    font-size: 90%;
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
