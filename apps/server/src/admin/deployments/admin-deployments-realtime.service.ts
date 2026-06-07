import { Injectable, UnauthorizedException } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import { WebSocket, WebSocketServer } from 'ws';

import { AdminTokenService } from '../admin-token.service';

type DeploymentLogMessage = {
  deployId: string;
  line: string;
  status?: string;
};

@Injectable()
export class AdminDeploymentsRealtimeService {
  private readonly server = new WebSocketServer({ noServer: true });
  private readonly clients = new Map<string, Set<WebSocket>>();

  constructor(private readonly tokenService: AdminTokenService) {}

  handleUpgrade(request: IncomingMessage, socket: Socket, head: Buffer) {
    const url = new URL(request.url ?? '', 'http://localhost');
    const match = url.pathname.match(/^\/api\/admin\/deployments\/(\d+)\/logs$/);

    if (!match) {
      return false;
    }

    try {
      const token = url.searchParams.get('token');
      if (!token) {
        throw new UnauthorizedException('请先登录后台');
      }
      this.tokenService.verifyAdminToken(token);
    } catch {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return true;
    }

    const deployId = match[1];
    this.server.handleUpgrade(request, socket, head, (client) => {
      this.addClient(deployId, client);
      client.send(JSON.stringify({ deployId, line: this.formatLine('已连接部署日志') }));
    });
    return true;
  }

  publish(message: DeploymentLogMessage) {
    const clients = this.clients.get(message.deployId);
    if (!clients?.size) {
      return;
    }

    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  formatLine(message: string) {
    if (/^\[\d{2}:\d{2}:\d{2}\]/.test(message)) {
      return message;
    }

    const now = new Date();
    const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((item) => String(item).padStart(2, '0'))
      .join(':');
    return `[${time}] ${message}`;
  }

  private addClient(deployId: string, client: WebSocket) {
    const clients = this.clients.get(deployId) ?? new Set<WebSocket>();
    clients.add(client);
    this.clients.set(deployId, clients);
    client.on('close', () => {
      clients.delete(client);
      if (clients.size === 0) {
        this.clients.delete(deployId);
      }
    });
  }
}
