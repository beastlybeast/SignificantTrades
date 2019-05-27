import Exchange from '../services/exchange'

class Noop extends Exchange {
  constructor(options) {
    super(options)

    this.id = 'noop'
  }

  connect() {
    return false
  }
}

export default Noop
