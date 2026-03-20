import { EventEmitter } from "events";

declare global {
  // eslint-disable-next-line no-var
  var eventEmitter: EventEmitter | undefined;
}

const eventEmitter = global.eventEmitter || (global.eventEmitter = new EventEmitter());

eventEmitter.setMaxListeners(50);

export default eventEmitter;
