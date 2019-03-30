<template>
	<div id="trades" class="trades" :class="{ '-logos': this.showLogos }">
		<ul v-if="trades.length">
			<li v-for="trade in trades" class="trades__item" :key="trade.id" :class="trade.classname" :style="{ backgroundImage: trade.image, backgroundColor: trade.background, color: trade.foreground }">
				<template v-if="trade.message">
					<div class="trades__item__side icon-side"></div>
					<div class="trades__item__message" v-html="trade.message"></div>
					<div class="trades__item__date" :timestamp="trade.timestamp">{{ trade.date }}</div>
				</template>
				<template v-else>
					<div class="trades__item__side icon-side"></div>
					<div class="trades__item__exchange" :title="trade.exchange">{{ trade.exchange }}</div>
					<div class="trades__item__price"><span class="icon-currency"></span> <span v-html="trade.price"></span></div>
					<div class="trades__item__amount">
						<span class="trades__item__amount__fiat"><span class="icon-currency"></span> <span v-html="trade.amount"></span></span>
						<span class="trades__item__amount__coin"><span class="icon-commodity"></span> <span v-html="trade.size"></span></span>
					</div>
					<div class="trades__item__date" :timestamp="trade.timestamp">{{ trade.date }}</div>
				</template>
			</li>
		</ul>
		<div v-else class="trades__item trades__item--empty">
			Nothing to show, yet.
		</div>
	</div>
</template>

<script>
import { mapState } from 'vuex';

import socket from '../services/socket';
import Sfx from '../services/sfx';

export default {
  data() {
    return {
      ticks: {},
      trades: [],
      gifs: {}
    };
  },
  computed: {
    ...mapState([
      'pair',
      'maxRows',
      'thresholds',
      'exchanges',
      'useAudio',
      'audioIncludeInsignificants',
      'decimalPrecision',
      'showLogos'
    ])
  },
  created() {
    this.getGifs();
    this.refreshColorsPercentages();

    socket.$on('pairing', this.onPairing);
    socket.$on('trades.instant', this.onTrades);

    this.onStoreMutation = this.$store.subscribe((mutation, state) => {
      switch (mutation.type) {
        case 'toggleAudio':
          if (mutation.payload) {
            this.sfx = new Sfx();
          } else {
            this.sfx && this.sfx.disconnect() && delete this.sfx;
          }
          break;
        case 'setThresholdGif':
          clearTimeout(this.gifKeywordChangeTimeout);
          this.gifKeywordChangeTimeout = setTimeout(this.fetchGifByKeyword.bind(this, mutation.payload.value, mutation.payload.index), 2000);
          break;
        case 'setThresholdColor':
        case 'setThresholdAmount':
          this.refreshColorsPercentages();
          this.trades.splice(0, this.trades.length);

          this.redrawList()
          break;
      }
    });
  },
  mounted() {
    if (this.useAudio) {
      this.sfx = new Sfx();

      if (this.sfx.context.state === 'suspended') {
        const resumeOnFocus = (() => {
          if (this.useAudio) {
            this.sfx.context.resume();
          }

          if (!this.useAudio || this.sfx.context.state !== 'suspended') {
             window.removeEventListener('focus', resumeOnFocus, false);
             window.removeEventListener('blur', resumeOnFocus, false);
          }
        }).bind(this)

        window.addEventListener('blur', resumeOnFocus, false);
        window.addEventListener('focus', resumeOnFocus, false);
      }
    }

    this.timeAgoInterval = setInterval(() => {
      for (let element of this.$el.querySelectorAll('[timestamp]')) {
        element.innerHTML = this.$root.ago(element.getAttribute('timestamp'));
      }
    }, 1000);

    this.redrawList();
  },
  beforeDestroy() {
    socket.$off('pairing', this.onPairing);
    socket.$off('trades.instant', this.onTrades);

    this.onStoreMutation();

    clearInterval(this.timeAgoInterval);

    this.sfx && this.sfx.disconnect();
  },
  methods: {
    onPairing() {
      this.trades = [];
    },
    onTrades(trades, silent = false) {
      for (let trade of trades) {
        this.processTrade(trade, Math.min(2000, trades[trades.length - 1][1] - trades[0][1]), silent);
      }
    },
    processTrade(trade, silent = false) {
      const size = trade[2] * trade[3];

      const multiplier = typeof this.exchanges[trade[0]].threshold !== 'undefined' ? +this.exchanges[trade[0]].threshold : 1;

      if (trade[5] === 1) {
        if (!silent && this.sfx) {
          this.sfx.liquidation();
        }

        if (size >= this.thresholds[0].amount * multiplier) {
          this.appendRow(
            trade,
            ['liquidation'],
            `${app.getAttribute('data-symbol')}<strong>${this.$root.formatAmount(size, 1)}</strong> liquidated <strong>${
              trade[4] > 0 ? 'SHORT' : 'LONG'
            }</strong> @ ${app.getAttribute('data-symbol')}${this.$root.formatPrice(trade[2])}`
          );
        }
        return;
      }

      if (
        !silent && this.useAudio &&
        ((this.audioIncludeInsignificants && size > this.thresholds[1].amount * Math.max(0.1, multiplier) * 0.1) ||
          size > this.thresholds[1].amount * Math.max(0.1, multiplier))
      ) {
        this.sfx && this.sfx.tradeToSong(size / (this.thresholds[1].amount * Math.max(0.1, multiplier)), trade[4]);
      }

      // group by [exchange name + buy=1/sell=0] (ex bitmex1)
      const tid = trade[0] + trade[4];
      const now = socket.getTime();

      if (this.thresholds[0].amount) {
        if (this.ticks[tid]) {
          if (now - this.ticks[tid][2] > 5000) {
            delete this.ticks[tid];
          } else {
            // average group prices
            this.ticks[tid][2] = (this.ticks[tid][2] * this.ticks[tid][3] + size) / 2 / ((this.ticks[tid][3] + trade[3]) / 2);

            // sum volume
            this.ticks[tid][3] += trade[3];

            if (this.ticks[tid][2] * this.ticks[tid][3] >= this.thresholds[0].amount * multiplier) {
              this.appendRow(this.ticks[tid]);
              delete this.ticks[tid];
            }

            return;
          }
        }

        if (!this.ticks[tid] && size < this.thresholds[0].amount * multiplier) {
          this.ticks[tid] = trade;
          return;
        }
      }

      this.appendRow(trade);
      // }, delay)
    },
    appendRow(trade, classname = [], message = null) {
      let icon;
      let image;
      let amount = trade[2] * trade[3];

      classname.push(trade[0]);

      const multiplier = this.exchanges[trade[0]] && typeof this.exchanges[trade[0]].threshold !== 'undefined' ? +this.exchanges[trade[0]].threshold : 1;

      let color = this.getTradeColor(trade, multiplier);

      if (trade[4]) {
        classname.push('buy');
      } else {
        classname.push('sell');
      }

      if (amount >= this.thresholds[1].amount * multiplier) {
        classname.push('significant');
      }

      for (let i = 1; i < this.thresholds.length; i++) {
        if (amount < this.thresholds[i].amount * multiplier) {
          break;
        }

        if (this.gifs[i] && this.gifs[i].length) {
          image = this.gifs[i][Math.floor(Math.random() * (this.gifs[i].length - 1))];
        }

        classname.push('level-' + i);
      }

      amount = this.$root.formatAmount(amount);

      if (image) {
        image = 'url(' + image + ')';
      }

      this.trades.unshift({
        id: Math.random().toString(36).substring(7),
        background: color.background,
        foreground: color.foreground,
        side: trade[4] > 0 ? 'BUY' : 'SELL',
        size: this.$root.formatAmount(trade[3], this.decimalPrecision),
        exchange: trade[0],
        price: this.$root.formatPrice(trade[2]),
        amount: amount,
        classname: classname.map(a => 'trades__item--' + a).join(' '),
        icon: icon,
        date: this.$root.ago(trade[1]),
        timestamp: trade[1],
        image: image,
        message: message
      });

      this.trades.splice(+this.maxRows || 20, this.trades.length);
    },
    getGifs(refresh) {
      this.thresholds.forEach((threshold, index) => {
        if (!threshold.gif) {
          return;
        }

        const storage = localStorage ? JSON.parse(localStorage.getItem('threshold_' + index + '_gifs')) : null;

        if (!refresh && storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7) {
          this.gifs[index] = storage.data;
        } else {
          this.fetchGifByKeyword(threshold.gif, index);
        }
      });
    },
    fetchGifByKeyword(keyword, index) {
      if (!keyword) {
        if (this.gifs[index]) {
          delete this.gifs[index];
        }

        localStorage.removeItem('threshold_' + index + '_gifs');

        return;
      }

      fetch('https://api.giphy.com/v1/gifs/search?q=' + keyword + '&rating=r&limit=100&api_key=b5Y5CZcpj9spa0xEfskQxGGnhChYt3hi')
        .then(res => res.json())
        .then(res => {
          if (!res.data || !res.data.length) {
            return;
          }

          this.gifs[index] = [];

          for (let item of res.data) {
            this.gifs[index].push(item.images.original.url);
          }

          localStorage.setItem(
            'threshold_' + index + '_gifs',
            JSON.stringify({
              timestamp: +new Date(),
              data: this.gifs[index]
            })
          );
        });
    },
    formatRgba(string) {
      const match = string.match(/rgba?\((\d+)[\s\,]*(\d+)[\s\,]*(\d+)(?:[\s\,]*([\d\.]+))?\)/);

      return {
        r: +match[1],
        g: +match[2],
        b: +match[3],
        a: typeof match[4] === 'undefined' ? 1 : +match[4]
      };
    },
    refreshColorsPercentages() {
      let uniqueThresholds = [];
      let amounts = [];

      for (let i = this.thresholds.length - 1; i >= 0; i--) {
        if (amounts.indexOf(+this.thresholds[i].amount) === -1) {
          uniqueThresholds.unshift(this.thresholds[i]);
          amounts.push(+this.thresholds[i].amount);
        }
      }

      const maximum = uniqueThresholds[uniqueThresholds.length - 1].amount;

      this.colors = {};

      this.colors.buys = uniqueThresholds.map((threshold, index) => ({
        pct: threshold.amount / maximum,
        color: this.formatRgba(threshold.buyColor)
      }));

      this.colors.sells = uniqueThresholds.map((threshold, index) => ({
        pct: threshold.amount / maximum,
        color: this.formatRgba(threshold.sellColor)
      }));
    },
    shadeRGBColor(color, percent) {
      var f=color.split(","),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=parseInt(f[0].slice(4)),G=parseInt(f[1]),B=parseInt(f[2]);
      return "rgb("+(Math.round((t-R)*p)+R)+","+(Math.round((t-G)*p)+G)+","+(Math.round((t-B)*p)+B)+")";
    },
    getTradeColor(trade, multiplier = 1) {
      const amount = trade[2] * trade[3];
      const pct = amount / (this.thresholds[this.thresholds.length - 1].amount * multiplier);
      const palette = this.colors[trade[4] > 0 ? 'buys': 'sells'];

      for (var i = 1; i < palette.length - 1; i++) {
        if (pct < palette[i].pct) {
          break;
        }
      }

      const lower = palette[i - 1];
      const upper = palette[i];
      const range = upper.pct - lower.pct;
      let rangePct = (pct - lower.pct) / range;
      let pctLower = 1 - rangePct;
      const pctUpper = rangePct;

      const backgroundRGB = {
        r: Math.floor(lower.color.r * pctLower + upper.color.r * rangePct),
        g: Math.floor(lower.color.g * pctLower + upper.color.g * rangePct),
        b: Math.floor(lower.color.b * pctLower + upper.color.b * rangePct),
        a: lower.color.a * pctLower + upper.color.a * rangePct
      };
      
      const background = `rgba(${backgroundRGB.r}, ${backgroundRGB.g}, ${backgroundRGB.b}, ${backgroundRGB.a})`;
      const luminance = Math.sqrt(0.299 * Math.pow(backgroundRGB.r, 2) + 0.587 * Math.pow(backgroundRGB.g, 2) + 0.114 * Math.pow(backgroundRGB.b, 2));

      let foreground;

      if (luminance > 200 || backgroundRGB.a === 1) {
        foreground = 'white';
      } else {
        rangePct *= 1.2;

        foreground = this.shadeRGBColor(`rgb(${backgroundRGB.r}, ${backgroundRGB.g}, ${backgroundRGB.b})`, rangePct);
      }

      return {
        background,
        foreground
      }
    },
    redrawList(lookback = 1000) {
      clearTimeout(this._refreshColorRenderList);

      this._refreshColorRenderList = setTimeout(() => {
        this.onTrades(socket.trades.slice(socket.trades.length - lookback, socket.trades.length), true);
      }, 500);
    }
  }
};
</script>

<style lang='scss'>
@import '../assets/sass/variables';

@keyframes highlight {
  0% {
    opacity: 0.75;
  }

  100% {
    opacity: 0;
  }
}

.trades {
  background-color: rgba(black, .2);

  ul {
    margin: 0;
    padding: 0;
    display: flex;
    flex-flow: column nowrap;
  }

  &.-logos {
    .trades__item__exchange {
      text-indent: -9999px;
      flex-basis: 3em;
      flex-grow: 0;
    }

    @each $exchange in $exchanges {
      .trades__item--#{$exchange} .trades__item__exchange {
        background-image: url("/static/exchanges/#{$exchange}.svg");
      }
    }
  }
}

.trades__item {
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
    animation: 5s $easeOutExpo highlight;
    pointer-events: none;
  }

  &.trades__item--empty {
    justify-content: center;
    padding: 20px;
    font-size: 80%;

    &:after {
      display: none;
    }
  }

  &.trades__item--sell {
    background-color: lighten($red, 35%);
    color: $red;

    .icon-side:before {
      content: unicode($icon-down);
    }
  }

  &.trades__item--buy {
    background-color: lighten($green, 50%);
    color: $green;

    .icon-side:before {
      content: unicode($icon-up);
    }
  }

  &.trades__item--level-1 {
    color: white;
  }

  &.trades__item--liquidation {
    background-color: $pink !important;
    color: white !important;
  }

  &.trades__item--level-2 {
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

  &.trades__item--level-3 {
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

    &.trades__item__side {
      flex-grow: 0;
      flex-basis: 1em;
      font-size: 1em;
      line-height: 1.06;

      + .trades__item__message {
        margin-left: 0.5em;
      }
    }

    &.trades__item__exchange {
      background-repeat: no-repeat;
      background-position: center center;
      flex-grow: 0.75;

      small {
        opacity: 0.8;
      }
    }

    &.trades__item__amount {
      position: relative;

      > span {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: all 0.1s ease-in-out;
        display: block;

        &.trades__item__amount__fiat {
          position: absolute;
        }

        &.trades__item__amount__coin {
          transform: translateX(25%);
          opacity: 0;
        }
      }

      &:hover {
        > span.trades__item__amount__coin {
          transform: none;
          opacity: 1;
        }

        > span.trades__item__amount__fiat {
          transform: translateX(-25%);
          opacity: 0;
        }
      }
    }

    &.trades__item__date {
      text-align: right;
      flex-basis: 2.5em;
      flex-grow: 0;
    }

    &.trades__item__message {
      flex-grow: 2;
      text-align: center;
      font-size: 90%;
    }
  }
}
</style>