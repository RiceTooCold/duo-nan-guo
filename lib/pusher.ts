import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
});

// Client-side Pusher instance (lazy initialized)
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (!pusherClientInstance) {
        pusherClientInstance = new PusherClient(
            process.env.NEXT_PUBLIC_PUSHER_KEY!,
            { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
        );
    }
    return pusherClientInstance;
}

// Pusher channel name helper
export function getMatchChannel(matchId: string): string {
    return `match-${matchId}`;
}

// Room channel for waiting room
export function getRoomChannel(matchId: string): string {
    return `room-${matchId}`;
}

// Game event types (during battle)
export const PUSHER_EVENTS = {
    STATE_UPDATE: 'state:update',
} as const;

// Room event types (waiting room)
export const ROOM_EVENTS = {
    PLAYER_JOINED: 'room:player-joined',
    GAME_STARTING: 'room:game-starting',
    GAME_STARTED: 'room:game-started',
    HOST_LEFT: 'room:host-left',
} as const;

