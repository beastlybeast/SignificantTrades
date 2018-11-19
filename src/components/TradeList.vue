<template>
	<div id="trades" class="trades">
		<ul v-if="trades.length">
			<li v-for="trade in trades" class="trades__item" :key="trade.id" :class="trade.classname" :style="{ backgroundImage: trade.image, backgroundColor: trade.background, color: trade.color }">
				<template v-if="trade.message">
					<div class="trades__item__side icon-side"></div>
					<div class="trades__item__message" v-html="trade.message"></div>
					<div class="trades__item__date" :timestamp="trade.timestamp">{{ trade.date }}</div>
				</template>
				<template v-else>
					<div class="trades__item__side icon-side"></div>
					<div class="trades__item__exchange">{{ trade.exchange }}</div>
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
      'audioIncludeInsignificants'
    ])
  },
  created() {
    this.getGifs();

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
      }
    });
  },
  mounted() {
    if (this.useAudio) {
      this.sfx = new Sfx();
    }

    this.timeAgoInterval = setInterval(() => {
      for (let element of this.$el.querySelectorAll('[timestamp]')) {
        element.innerHTML = this.$root.ago(element.getAttribute('timestamp'));
      }
    }, 1000);
  },
  beforeDestroy() {
    socket.$off('pairing', this.onPairing);
    socket.$off('trades.instant', this.onTrades);

    this.onStoreMutation();

    clearInterval(this.timeAgoInterval);

    this.sfx && this.sfx.disconnect();
  },
  methods: {
    onSettings(data) {
    },
    onPairing() {
      this.trades = [];
    },
    onTrades(trades) {
      for (let trade of trades) {
        this.processTrade(trade, Math.min(2000, trades[trades.length - 1][1] - trades[0][1]));
      }
    },
    processTrade(trade, delay) {
      // setTimeout(() => {
      const size = trade[2] * trade[3];

      const multiplier = typeof this.exchanges[trade[0]].thresholds !== 'undefined' ? +this.exchanges[trade[0]].thresholds : 1;

      if (trade[5] === 1) {
        this.sfx && this.sfx.liquidation();

        if (size >= this.thresholds[0].amount * multiplier) {
          this.appendRow(
            trade,
            ['liquidation'],
            `${app.getAttribute('data-symbol')}<strong>${this.$root.formatAmount(size, 1)}</strong> liquidated <strong>${
              trade[4] ? 'SHORT' : 'LONG'
            }</strong> @ ${app.getAttribute('data-symbol')}${this.$root.formatPrice(trade[2])}`
          );
        }
        return;
      }

      if (
        this.useAudio &&
        ((this.audioIncludeInsignificants && size > this.thresholds[0].amount * Math.max(0.1, multiplier) * 0.1) ||
          size > this.thresholds[1].amount * Math.max(0.1, multiplier))
      ) {
        this.sfx && this.sfx.tradeToSong(size / (this.thresholds[1].amount * Math.max(0.1, multiplier)), trade[4]);
      }

      // group by [exchange name + buy=1/sell=0] (ex bitmex1)
      const tid = trade[0] + trade[4];

      if (this.thresholds[0].amount) {
        if (this.ticks[tid]) {
          if (+new Date() - this.ticks[tid][2] > 5000) {
            delete this.ticks[tid];
          } else {
            // average group prices
            this.ticks[tid][2] = (this.ticks[tid][2] * this.ticks[tid][3] + size) / 2 / ((this.ticks[tid][3] + trade[3]) / 2);

            // sum volume
            this.ticks[tid][3] += trade[3];

            if (this.ticks[tid][2] * this.ticks[tid][3] >= thresholds[0].amount * multiplier) {
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
      let background, color;
      let amount = trade[2] * trade[3];

      const multiplier = typeof this.exchanges[trade[0]].thresholds !== 'undefined' ? +this.exchanges[trade[0]].thresholds : 1;

      if (trade[4]) {
        classname.push('buy');
      } else {
        classname.push('sell');
      }

      if (amount >= this.thresholds[1].amount * multiplier) {
        classname.push('significant');
      
        let ratio = Math.min(1, (amount - this.thresholds[1].amount * multiplier) / (this.thresholds[2].amount * multiplier - this.thresholds[1].amount * multiplier));

        if (trade[4]) {
          background = `hsl(89, ${(36 + (1 - ratio) * 10).toFixed(2)}%, ${(35 + ratio * 20).toFixed(2)}%)`;
        } else {
          background = `hsl(4, ${(70 + ratio * 30).toFixed(2)}%, ${(45 + (1 - ratio) * 15).toFixed(2)}%)`;
        }
      } else {
        let ratio = Math.min(1, amount / this.thresholds[1].amount * multiplier);
        let hsl;

        if (trade[4]) {
          hsl = `89, ${(36 + (1 - ratio) * 10).toFixed(2)}%, ${(35 + ratio * 40).toFixed(2)}%`;
          color = `hsl(${hsl})`;
          background = `hsla(${hsl}, .1)`;
        } else {
          hsl = `4, ${(70 + ratio * 30).toFixed(2)}%, ${(45 + (1 - ratio) * 30).toFixed(2)}%`;
          color = `hsl(${hsl})`;
          background = `hsla(${hsl}, .1)`;
        }
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
        id: Math.random()
          .toString(36)
          .substring(7),
        color: color,
        background: background,
        side: trade[4] ? 'BUY' : 'SELL',
        size: trade[3],
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
      console.log('fetchGifByKeyword', keyword, index);

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
  ul {
    margin: 0;
    padding: 0;
    display: flex;
    flex-flow: column nowrap;
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
  }

  &.trades__item--level-2 {
    padding: 0.6em 0.6em;

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
      flex-grow: 0.75;
      min-width: 4.5em;

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