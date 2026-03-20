import { vi } from "vitest";

export class Sender {
  universe: number;
  reuseAddr: boolean;
  useUnicastDestination: string;

  send = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();

  constructor(opts: { universe: number; reuseAddr: boolean; useUnicastDestination: string }) {
    this.universe = opts.universe;
    this.reuseAddr = opts.reuseAddr;
    this.useUnicastDestination = opts.useUnicastDestination;
  }
}
