# Changelog

All notable changes to this project will be documented in this file.

## [2.5.6] - 2020-05-08

### Changed

- Fix chart's broken cumulative data after keepalive redraw
- Fix exchange threshold (threshold x multiplier) formula
- Lowered exchange threshold slider steps (ux)
- Fix 1000k issue
- Sound varitions now match thresholds (1 bip at minimum threshold, 2 at the 2nd threshold, 4 at the third)
- Doubled sell song power
- Fixed ohlc "high" spkike at liquidation (server)

## [2.5.5] - 2020-05-06

### Added

- Products autocomplete (search)

## [2.5.4] - 2020-05-02

### Added

- Vue CLI 3
- Webpack dev server with proxy
- Stats histogram type for multi counters (when input is an array)
- Choose serie type (line, bar, candlestick, histogram) in serie dialog (experimental)

### Changed

- Fixed aggegation accuracy
- Fixed stats chart update interval (always 1s)
- Default stats now include 1h liquidation (shorts vs longs) as multi counter
- Improved threshold colors efficiency
- Big codestyle fix

## [2.5.3] - 2020-04-28

### Changed

- Fixed update of stats period
- Pause stats keepAlive when mouse over stats chart

## [2.5.2] - 2020-04-27

### Changed

- Fixed counters edition
- Chart height when exchangesBar is visible

## [2.5.1] - 2020-04-22

### Added

- Changelog !
- Stats panel is back
- Counters and stats are only updated after 1s to reduce lag
- Expose candle border colors (borderUpColor + borderDownColor) in price serie settings

### Changed

- Loading indicator now working again
- Fixed a bunch of mutations subscriptions
- Increased default chart refresh rate from 50ms to 500ms
- Enabled Huobi by default
- Disabled FTX by default
