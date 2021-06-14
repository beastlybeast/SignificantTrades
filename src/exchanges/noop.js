import Exchange from '../services/exchange'

class Noop extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'noop'

    this.initialize()
  }

  connect() {
    return false
  }
}

export default Noop
