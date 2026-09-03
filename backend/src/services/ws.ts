import type { WebSocket } from 'ws';

export interface WsMessage {
  type:
    | 'device_state_changed'
    | 'device_availability_changed'
    | 'device_discovered'
    | 'device_adopted'
    | 'automation_triggered'
    | 'notification_created'
    | 'initial_state'
    | 'pong';
  payload?: any;
  timestamp: string;
}

class WebSocketGateway {
  private clients = new Set<WebSocket>();

  registerClient(ws: WebSocket) {
    this.clients.add(ws);

    ws.on('close', () => {
      this.clients.delete(ws);
    });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch {}
    });
  }

  broadcast(type: WsMessage['type'], payload: any) {
    const data = JSON.stringify({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });

    for (const ws of this.clients) {
      if (ws.readyState === 1) { // OPEN
        ws.send(data);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsGateway = new WebSocketGateway();
