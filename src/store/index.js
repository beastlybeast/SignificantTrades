import Vue from 'vue'
import Vuex from 'vuex'
import * as helpers from '../utils/helpers'

console.log(helpers)

import settings from './settings'
import app from './app'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules: {
    app,
    settings
  }
})

if (store.state.settings.pair && store.state.settings.pair.length) {
  store.state.app.pairs = store.state.settings.pair.split('+')
}

let saveTimeout

store.subscribe((mutation, state) => {
  if (/^settings/.test(mutation.type)) {
    clearTimeout(saveTimeout)

    saveTimeout = setTimeout(() => {
      console.log(mutation, 'save..')
      const copy = JSON.parse(JSON.stringify(state.settings))
      localStorage.setItem('settings', JSON.stringify(copy))

      let exchangeName

      switch (mutation.type) {
        case 'settings/SHOW_EXCHANGE':
        case 'settings/HIDE_EXCHANGE':
        case 'settings/TOGGLE_EXCHANGE_VISIBILITY':
        case 'settings/ENABLE_EXCHANGE':
        case 'settings/DISABLE_EXCHANGE':
        case 'settings/SET_EXCHANGE_MATCH':
          if (typeof mutation.payload.exchange === 'string') {
            exchangeName = mutation.payload.exchange
          } else {
            exchangeName = mutation.payload
          }

          store.dispatch('app/refreshExchange', exchangeName)
          break
      }
    }, 200)
  }
})

export default store
