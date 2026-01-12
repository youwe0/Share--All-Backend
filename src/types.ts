import { WebSocket } from 'ws';

export enum SignalingMessageType {
  JOIN_ROOM = 'join_room',
  ROOM_JOINED = 'room_joined',
  PEER_JOINED = 'peer_joined',
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice_candidate',
  PEER_LEFT = 'peer_left',
  ERROR = 'error',
}

export interface BaseSignalingMessage {
  type: SignalingMessageType;
  roomId: string;
}

export interface JoinRoomMessage extends BaseSignalingMessage {
  type: SignalingMessageType.JOIN_ROOM;
  peerId: string;
}

export interface RoomJoinedMessage extends BaseSignalingMessage {
  type: SignalingMessageType.ROOM_JOINED;
  peerId: string;
}

export interface PeerJoinedMessage extends BaseSignalingMessage {
  type: SignalingMessageType.PEER_JOINED;
  peerId: string;
}

export interface OfferMessage extends BaseSignalingMessage {
  type: SignalingMessageType.OFFER;
  offer: RTCSessionDescriptionInit;
  from: string;
}

export interface AnswerMessage extends BaseSignalingMessage {
  type: SignalingMessageType.ANSWER;
  answer: RTCSessionDescriptionInit;
  from: string;
}

export interface IceCandidateMessage extends BaseSignalingMessage {
  type: SignalingMessageType.ICE_CANDIDATE;
  candidate: RTCIceCandidateInit;
  from: string;
}

export interface PeerLeftMessage extends BaseSignalingMessage {
  type: SignalingMessageType.PEER_LEFT;
  peerId: string;
}

export interface ErrorMessage extends BaseSignalingMessage {
  type: SignalingMessageType.ERROR;
  error: string;
}

export type SignalingMessage =
  | JoinRoomMessage
  | RoomJoinedMessage
  | PeerJoinedMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | PeerLeftMessage
  | ErrorMessage;

export interface Peer {
  id: string;
  ws: WebSocket;
}

export interface Room {
  id: string;
  peers: Map<string, Peer>;
  createdAt: Date;
}

export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}
