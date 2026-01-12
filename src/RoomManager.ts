import { WebSocket } from 'ws';
import { Room, Peer, SignalingMessage, ErrorMessage, SignalingMessageType } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private readonly maxPeersPerRoom: number;
  private readonly roomTimeoutMs: number;

  constructor(maxPeersPerRoom: number = 2, roomTimeoutMs: number = 3600000) {
    this.maxPeersPerRoom = maxPeersPerRoom;
    this.roomTimeoutMs = roomTimeoutMs;

    setInterval(() => {
      this.cleanupExpiredRooms();
    }, 60000);
  }

  createRoom(roomId: string): Room {
    const room: Room = {
      id: roomId,
      peers: new Map(),
      createdAt: new Date(),
    };

    this.rooms.set(roomId, room);
    console.log(`Room created: ${roomId}`);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, peerId: string, ws: WebSocket): boolean {
    let room = this.getRoom(roomId);

    if (!room) {
      room = this.createRoom(roomId);
    }

    if (room.peers.size >= this.maxPeersPerRoom) {
      console.log(`Room ${roomId} is full`);
      return false;
    }

    const peer: Peer = { id: peerId, ws };
    room.peers.set(peerId, peer);

    console.log(`Peer ${peerId} joined room ${roomId} (${room.peers.size}/${this.maxPeersPerRoom})`);
    return true;
  }

  leaveRoom(roomId: string, peerId: string): void {
    const room = this.getRoom(roomId);
    if (!room) return;

    room.peers.delete(peerId);
    console.log(`Peer ${peerId} left room ${roomId}`);

    if (room.peers.size === 0) {
      this.deleteRoom(roomId);
    }
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
    console.log(`Room deleted: ${roomId}`);
  }

  broadcastToPeers(roomId: string, senderId: string, message: SignalingMessage): void {
    const room = this.getRoom(roomId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    room.peers.forEach((peer, peerId) => {
      if (peerId !== senderId && peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(messageStr);
      }
    });
  }

  sendError(ws: WebSocket, roomId: string, error: string): void {
    const errorMessage: ErrorMessage = {
      type: SignalingMessageType.ERROR,
      roomId,
      error,
    };

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(errorMessage));
    }
  }

  private cleanupExpiredRooms(): void {
    const now = new Date().getTime();

    this.rooms.forEach((room, roomId) => {
      const age = now - room.createdAt.getTime();
      if (age > this.roomTimeoutMs) {
        room.peers.forEach((peer) => {
          if (peer.ws.readyState === WebSocket.OPEN) {
            peer.ws.close();
          }
        });
        this.deleteRoom(roomId);
        console.log(`Expired room cleaned up: ${roomId}`);
      }
    });
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getPeerCount(roomId: string): number {
    const room = this.getRoom(roomId);
    return room ? room.peers.size : 0;
  }
}
