import { AnyTransferable } from "./types"

export class AWTTransferable<T extends AnyTransferable> {
  #value: T
  constructor(value: T) {
    this.#value = value
  }
  static getTransferableValue(t: AWTTransferable<any>) {
    return t.#value
  }
  get valueOf() {
    return this.#value
  }
}
