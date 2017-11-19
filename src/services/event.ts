import * as _ from 'lodash';

export default class Event<T> {
  listeners: ((arg: T) => any)[] = [];

  attach(handler: (arg: T) => any): () => any {
    this.listeners.push(handler);
    return () => {
      this.detach(handler);
    }
  }

  detach(handler: (arg: T) => any) {
    this.listeners = _.without(this.listeners, handler);
  }

  emit(arg: T) {
    _.each(this.listeners, (l) => l(arg));
  }
}

