import dollarSign from '@fortawesome/fontawesome-free-solid/faDollarSign';
import bitcoin from '@fortawesome/fontawesome-free-brands/faBtc';
import yenSign from '@fortawesome/fontawesome-free-solid/faYenSign';
import euroSign from '@fortawesome/fontawesome-free-solid/faEuroSign';
import poundSign from '@fortawesome/fontawesome-free-solid/faPoundSign';

var helper = {
  data() {
    return {
      currencyIcon: dollarSign,
      commodityIcon: bitcoin,
    }
  },
  methods: {
    formatPrice: function(price) {
			return price.toFixed(6 - price.toFixed().length)
    },
    getSymbol: function(pair, unicode = false) {
      pair = pair.toUpperCase();

      const symbols = {
        BTC: [bitcoin, '฿'],
        GBP: [poundSign, '฿'],
        EUR: [euroSign, '€'],
        USD: [dollarSign, '$'],
        JPY: [yenSign, '¥'],
      }

      for (let symbol of Object.keys(symbols)) {
        if (new RegExp(symbol + '$').test(pair.toUpperCase())) {

          if (unicode) {
            return symbols[symbol][1];
          } else {
            this.$set(this.currencyIcon, 'icon', symbols[symbol][0].icon)

            return this.currencyIcon;
          }
        }
      }

      return pair.substr(-3);
    }
  }
}

export default helper;