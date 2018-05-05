# SignificantTrades-vue

A more useful version of the Recent Trades pane on Bitmex.

![screenshot](https://i.imgur.com/cb3TVvR.png)

## About

Bitmex's Recent Trades pane has a terrible signal-to-noise ratio because of bot activity and the fact that market orders are not batched by order but by matched price, usually resulting in many lines for a single 50k order.

This script uses Bitmex's public trades websocket and does a few things:

1. It collapses all orders with the same timestamp into one line.
2. It allows you to filter out orders less than a particular size.
3. It highlights orders that exceed a certain size.

The end result is a Recent Trades pane you can watch without getting a seizure, and which can be a useful tool to see when aggressive orders are coming in.

## How To Use

1. Open this link: https://beastlybeast.github.io/SignificantTrades/index.html
2. Then type in the symbol name (e.g. XBTUSD), the minimum order threshold (e.g. 5000), and click submit.

## Support Further Development

I'm not a developer, I'm a trader, and I'm paying contractors to build and improve this tool. To contribute ideas or request bug fixes, please use the github issues feature. If you are a developer and would like to contribute code, feel free to do so via Github (or fork this repo). Please make sure to credit me if you do.

Lastly, if you find this tool useful, please consider sending a donation to support further development.

BTC (segwit) address: bc1q32ncgq5aaffz6l5vxrvfejfwdm9jhqdc3qvk5x

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

For a detailed explanation on how things work, check out the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
