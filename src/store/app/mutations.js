import Vue from 'vue'

export default {
  EXCHANGE_UPDATED(state, { exchange, active }) {
    if (!this.state.settings.exchanges[exchange]) {
      Vue.set(this.state.settings.exchanges, exchange, {})
    }

    const index = state.actives.indexOf(exchange)

    if (active && index === -1) {
      state.actives.push(exchange)
    } else if (!active && index !== -1) {
      state.actives.splice(index, 1)
    }
  },
  TOGGLE_LOADING(state, value) {
    state.isLoading = value ? true : false
  },
  CREATE_NOTICE(state, notice) {
    state.notices.push(notice)
  },
  REMOVE_NOTICE(state, notice) {
    const index = state.notices.indexOf(notice)

    if (index !== -1) {
      if (notice.hideTimeout) {
        clearTimeout(notice.hideTimeout)
      }

      state.notices.splice(index, 1)
    }
  },
  TOGGLE_SEARCH(state, value) {
    state.showSearch = typeof value !== 'undefined' ? !!value : !state.showSearch
  },
  SET_OPTIMAL_DECIMAL(state, value) {
    state.optimalDecimal = value
  },
  SET_API_URL(state, value) {
    state.apiUrl = value
  },
  SET_PROXY_URL(state, value) {
    state.proxyUrl = value
  },
  SET_API_SUPPORTED_PAIRS(state, value) {
    if (!value) {
      state.apiSupportedPairs = []
    } else if (typeof value === 'string') {
      state.apiSupportedPairs = value.split(',')
    } else {
      state.apiSupportedPairs = value
    }
  },
  SET_VERSION(state, value) {
    state.version = value
  }
}
