import Counter from './counter'

export default class MultiCounter extends Counter {
  getModel() {
    return JSON.parse(JSON.stringify(this.model))
  }

  addData(data) {
    for (let i = 0; i < data.length; i++) {
      this.stacks[this.stacks.length - 1][i] += data[i]
      this.live[i] += data[i]
    }
  }

  substractData(data) {
    for (let i = 0; i < data.length; i++) {
      this.live[i] -= data[i]
    }
  }
}
