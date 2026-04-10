import { vi } from "vitest";

export class Client {
  host: string;
  port: number;

  send = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
  on = vi.fn();

  constructor(host: string, port: number) {
    this.host = host;
    this.port = port;
  }
}

export class Server {
  port: number;
  host: string;

  close = vi.fn().mockResolvedValue(undefined);
  on = vi.fn();

  constructor(port: number, host: string) {
    this.port = port;
    this.host = host;
  }
}
