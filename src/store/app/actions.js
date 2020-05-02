export default {
  refreshExchange({ commit }, exchange) {
    const active =
      !this.state.settings.exchanges[exchange] ||
      (this.state.settings.exchanges[exchange].match &&
        !this.state.settings.exchanges[exchange].disabled &&
        !this.state.settings.exchanges[exchange].hidden)

    commit('EXCHANGE_UPDATED', {
      exchange,
      active
    })
  },
  showNotice({ commit, dispatch }, notice) {
    dispatch('hideNotice', notice.id)

    if (notice.delay !== false) {
      notice.hideTimeout = setTimeout(() => {
        dispatch('hideNotice', notice.id)
      }, notice.delay || 2000)
    }

    commit('CREATE_NOTICE', notice)
  },
  hideNotice({ commit }, id) {
    for (let i = 0; i < this.state.app.notices.length; i++) {
      if (this.state.app.notices[i].id === id) {
        commit('REMOVE_NOTICE', this.state.app.notices[i])
      }
    }
  }
}
