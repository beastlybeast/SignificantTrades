<template>
  <div class="trades">
    <ul v-if="trades.length">
      <li v-for="trade in trades" class="trades__item" :key="trade.id" :class="trade.classname" :style="{ 'background-image': trade.image, 'background-color': trade.hsl }">
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
  import options from '../services/options'
  import socket from '../services/socket'
  import Sfx from '../services/sfx'

  export default {
    data () {
      return {
        ticks: {},
        trades: [],
        gifs: {},
      }
    },
    created() {
      this.getGifs();
    },
    mounted() {
      if (options.useAudio) {
        this.sfx = new Sfx();
      }

      socket.$on('pairing', this.onPairing);
      socket.$on('trades', this.onTrades);

      setTimeout(() => {
        options.$on('change', this.onSettings);
      }, 1000);

      this.timeAgoInterval = setInterval(() => {
        for (let element of this.$el.querySelectorAll('[timestamp]')) {
          element.innerHTML = this.ago(element.getAttribute('timestamp'));
        }
      }, 1000);
    },
    beforeDestroy() {
      socket.$off('pairing', this.onPairing);
      socket.$off('trades', this.onTrades);
      options.$off('change', this.onSettings);

      clearInterval(this.timeAgoInterval);

      this.sfx && this.sfx.disconnect();
    },
    methods: {
      onSettings(data) {
        switch (data.prop) {
          case 'useAudio':
            if (data.value) {
              this.sfx = new Sfx();
            } else {
              this.sfx && this.sfx.disconnect() && delete this.sfx;
            }
          break;
          case 'gifsThresholds':
            data.value.forEach((keyword, index) => {
              if (this.keywords[index] !== keyword) {
                clearTimeout(this.gifKeywordFetchTimeout);
                this.gifKeywordFetchTimeout = setTimeout(this.fetchGifByKeyword.bind(this, keyword, index), 2000);
              }
            })
          break;
        }
      },
      onPairing() {
        this.trades = [];
      },
      onTrades(trades) {
        for (let trade of trades) {
          const size = trade[2] * trade[3];

          const multiplier = typeof options.exchangeThresholds[trade[0]] === 'string' ? +options.exchangeThresholds[trade[0]] : 1;

          if (trade[5] === 1) {
            this.sfx && this.sfx.liquidation();

            if (size >= options.thresholds[0] * multiplier) {
              this.appendRow(trade, ['liquidation'], `${app.getAttribute('data-symbol')}<strong>${formatAmount(size, 1)}</strong> liquidated <strong>${trade[4] ? 'SHORT' : 'LONG'}</strong> @ ${app.getAttribute('data-symbol')}${formatPrice(trade[2])}`);
            }
            continue;
          }
          
          if (options.useAudio && ((options.audioIncludeAll && size > options.thresholds[0] * Math.max(.1, multiplier) * .1) || size > options.thresholds[1] * Math.max(.1, multiplier))) {
            this.sfx && this.sfx.tradeToSong(size / (options.thresholds[1] * multiplier), trade[4]);
          }

          // group by [exchange name + buy=1/sell=0] (ex bitmex1)
          const tid = trade[0] + trade[4];

          if (options.thresholds[0]) {
            if (this.ticks[tid]) {
              if (+new Date() - this.ticks[tid][2] > 5000) {
                delete this.ticks[tid];
              } else {

                // average group prices
                this.ticks[tid][2] = (this.ticks[tid][2] * this.ticks[tid][3] + size) / 2 / ((this.ticks[tid][3] + trade[3]) / 2);

                // sum volume
                this.ticks[tid][3] += trade[3];

                if (this.ticks[tid][2] * this.ticks[tid][3] >= options.thresholds[0] * multiplier) {
                  this.appendRow(this.ticks[tid]);
                  delete this.ticks[tid];
                }

                continue;
              }
            }

            if (!this.ticks[tid] && size < options.thresholds[0] * multiplier) {
              this.ticks[tid] = trade;
              continue;
            }
          }

          this.appendRow(trade);
        }

        this.trades.splice(+options.maxRows || 20, this.trades.length);
      },
      appendRow(trade, classname = [], message = null) {
        let icon;
        let image;
        let hsl;
        let amount = trade[2] * trade[3];

        const multiplier = typeof options.exchangeThresholds[trade[0]] === 'string' ? +options.exchangeThresholds[trade[0]] : 1;

        if (trade[4]) {
          classname.push('buy');
        } else {
          classname.push('sell');
        }

        if (amount >= options.thresholds[1] * multiplier) {
          classname.push('significant');

          if (options.useShades) {
            let ratio = Math.min(1, (amount - options.thresholds[1] * multiplier) / (options.thresholds[2] * multiplier - options.thresholds[1] * multiplier));

            if (trade[4]) {
              hsl = `hsl(89, ${(36 + ((1 - ratio) * 10)).toFixed(2)}%, ${(35 + (ratio * 20)).toFixed(2)}%)`;
            } else {
              hsl = `hsl(4, ${(70 + (ratio * 30)).toFixed(2)}%, ${(45 + ((1 - ratio) * 15)).toFixed(2)}%)`;
            }
          }
        }

        for (let i=1; i<options.thresholds.length; i++) {
          if (amount < options.thresholds[i] * multiplier) {
            break;
          }

          if (this.gifs[i] && this.gifs[i].length) {
            image = this.gifs[i][Math.floor(Math.random() * (this.gifs[i].length - 1))];
          }

          classname.push('level-' + i);
        }

        amount = formatAmount(amount);

        if (image) {
          image = 'url(\'' + image + '\')';
        }

        this.trades.unshift({
          id: Math.random().toString(36).substring(7),
          hsl: hsl,
          side: trade[4] ? 'BUY' : 'SELL',
          size: trade[3],
          exchange: trade[0],
          price: formatPrice(trade[2]),
          amount: amount,
          classname: classname.map(a => 'trades__item--' + a).join(' '),
          icon: icon,
          date: this.ago(trade[1]),
          timestamp: trade[1],
          image: image,
          message: message
        });
      },
      getGifs(refresh) {
        this.keywords = options.gifsThresholds.slice(0, options.gifsThresholds.length);

        options.gifsThresholds.forEach((keyword, index) => {
          if (!keyword) {
            return;
          }

          const storage = localStorage ? JSON.parse(localStorage.getItem('threshold_' + index + '_gifs')) : null;

          if (!refresh && storage && +new Date() - storage.timestamp < 1000 * 60 * 60 * 24 * 7) {
            this.gifs[index] = storage.data;
          } else {
            this.fetchGifByKeyword(keyword, index);
          }
        });
      },
      ago(timestamp) {
        const seconds = Math.floor((new Date() - timestamp) / 1000);
        let interval, output;

        if ((interval = Math.floor(seconds / 31536000)) > 1)
          output = interval + 'y';
        else if ((interval = Math.floor(seconds / 2592000)) > 1)
          output = interval + 'm';
        else if ((interval = Math.floor(seconds / 86400)) > 1)
          output = interval + 'd';
        else if ((interval = Math.floor(seconds / 3600)) > 1)
          output = interval + 'h';
        else if ((interval = Math.floor(seconds / 60)) > 1)
          output = interval + 'm';
        else
          output = Math.ceil(seconds) + 's';

        return output;
      },
      fetchGifByKeyword(keyword, index) {
        this.keywords[index] = keyword;

        if (!keyword) {
          if (this.gifs[index]) {
            console.log(`remove gifs at index ${index}`);
            delete this.gifs[index];
          }

          localStorage.removeItem('threshold_' + index + '_gifs');

          return;
        }

        console.log(`get giphy for keyword ${keyword}`);

        fetch('https://api.giphy.com/v1/gifs/search?q=' + keyword + '&rating=r&limit=100&api_key=b5Y5CZcpj9spa0xEfskQxGGnhChYt3hi')
          .then(res => res.json())
          .then(res => {
            if (!res.data || !res.data.length) {
              console.log(`giphy => no result for keyword ${keyword}`);
              return;
            }

            console.log(`save ${res.data.length} gifs at index ${index}`);

            this.gifs[index] = [];

            for (let item of res.data) {
              this.gifs[index].push(item.images.original.url);
            }

            localStorage.setItem('threshold_' + index + '_gifs', JSON.stringify({
              timestamp: +new Date(),
              data: this.gifs[index]
            }))
          });
      }
    }
  }
</script>

<style lang="scss">
	@import '../assets/sass/variables';

  @keyframes highlight {
    0% {
        opacity: .75;
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
    padding: .4em .6em;
    background-position: center center;
    background-size: cover;
    background-blend-mode: overlay;
    position: relative;
    align-items: center;

    @media only screen and (min-width: 480px) {
      font-size: 1.25em;
    }

    @media only screen and (min-width: 1024px) {
      font-size: 1.5em;
    }

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

      &.trades__item--significant {
        background-color: $red;
      }

      .icon-side:before {
        content: unicode($icon-down);
      }
    }

    &.trades__item--buy {
      background-color: lighten($green, 50%);
      color: $green;

      &.trades__item--significant {
        background-color: $green;
      }

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
      padding: .6em .6em;

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
        background-color: rgba(black, .2);
      }
    }

    &.trades__item--level-3 {
      box-shadow: 0 0 20px rgba(red, .5);
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
          margin-left: .5em;
        }
      }

      &.trades__item__exchange {
        flex-grow: .75;
        min-width: 4.5em;

        small {
          opacity: .8;
        }
      }

      &.trades__item__amount {
        position: relative;

        > span {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          transition: all .1s ease-in-out;
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
        flex-basis: 4em;
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