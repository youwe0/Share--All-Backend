import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { RoomManager } from './RoomManager';
import {
  SignalingMessage,
  SignalingMessageType,
  JoinRoomMessage,
  RoomJoinedMessage,
  PeerJoinedMessage,
  PeerLeftMessage,
} from './types';

export class SignalingServer {
  private wss: WebSocketServer;
  private roomManager: RoomManager;

  constructor(server: HTTPServer, maxPeersPerRoom: number, roomTimeoutMs: number) {
    this.wss = new WebSocketServer({ server });
    this.roomManager = new RoomManager(maxPeersPerRoom, roomTimeoutMs);

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection');

      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('Signaling server initialized');
  }

  private handleMessage(ws: WebSocket, data: Buffer): void {
    try {
      const message: SignalingMessage = JSON.parse(data.toString());

      switch (message.type) {
        case SignalingMessageType.JOIN_ROOM:
          this.handleJoinRoom(ws, message as JoinRoomMessage);
          break;

        case SignalingMessageType.OFFER:
        case SignalingMessageType.ANSWER:
        case SignalingMessageType.ICE_CANDIDATE:
          this.handleSignalingMessage(message);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.roomManager.sendError(ws, '', 'Invalid message format');
    }
  }

  private handleJoinRoom(ws: WebSocket, message: JoinRoomMessage): void {
    const { roomId, peerId } = message;

    const success = this.roomManager.joinRoom(roomId, peerId, ws);

    if (!success) {
      this.roomManager.sendError(ws, roomId, 'Room is full');
      return;
    }

    const roomJoinedMessage: RoomJoinedMessage = {
      type: SignalingMessageType.ROOM_JOINED,
      roomId,
      peerId,
    };
    ws.send(JSON.stringify(roomJoinedMessage));

    const peerCount = this.roomManager.getPeerCount(roomId);
    if (peerCount > 1) {
      const peerJoinedMessage: PeerJoinedMessage = {
        type: SignalingMessageType.PEER_JOINED,
        roomId,
        peerId,
      };
      this.roomManager.broadcastToPeers(roomId, peerId, peerJoinedMessage);
    }

    (ws as ExtendedWebSocket).roomId = roomId;
    (ws as ExtendedWebSocket).peerId = peerId;
  }

  private handleSignalingMessage(message: SignalingMessage): void {
    const { roomId } = message;

    if ('from' in message) {
      this.roomManager.broadcastToPeers(roomId, message.from, message);
    }
  }

  private handleDisconnect(ws: WebSocket): void {
    const extWs = ws as ExtendedWebSocket;
    const { roomId, peerId } = extWs;

    if (roomId && peerId) {
      this.roomManager.leaveRoom(roomId, peerId);

      const peerLeftMessage: PeerLeftMessage = {
        type: SignalingMessageType.PEER_LEFT,
        roomId,
        peerId,
      };
      this.roomManager.broadcastToPeers(roomId, peerId, peerLeftMessage);
    }

    console.log('WebSocket disconnected');
  }

  getStats() {
    return {
      connections: this.wss.clients.size,
      rooms: this.roomManager.getRoomCount(),
    };
  }
}

interface ExtendedWebSocket extends WebSocket {
  roomId?: string;
  peerId?: string;
}
