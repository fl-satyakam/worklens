import { Response } from 'express';
import { FileEvent } from '../types';

export class SSEManager {
  private clients: Set<Response> = new Set();

  addClient(res: Response): void {
    this.clients.add(res);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(event: FileEvent): void {
    const data = JSON.stringify(event);

    this.clients.forEach(client => {
      try {
        client.write(`data: ${data}\n\n`);
      } catch (error) {
        this.clients.delete(client);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
