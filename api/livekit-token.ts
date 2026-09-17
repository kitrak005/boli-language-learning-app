import { AccessToken } from 'livekit-server-sdk';

// Vercel serverless function handler. Vercel automatically parses JSON bodies
// and provides res.status()/.json() helpers for functions in the /api folder.
//
// Expected request body (sent by VoiceModeView.tsx):
//   { roomName: string, participantName: string, language?: string }
//
// Response shape consumed by VoiceModeView.tsx's initLiveKit():
//   { isLiveKitConfigured: boolean, token?: string, serverUrl?: string }
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed. Use POST.' });
        return;
    }

    try {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const serverUrl = process.env.LIVEKIT_URL; // e.g. wss://your-project.livekit.cloud

        if (!apiKey || !apiSecret || !serverUrl) {
            console.warn('[VAKYA] LiveKit env vars missing — LIVEKIT_API_KEY/LIVEKIT_API_SECRET/LIVEKIT_URL');
            res.status(200).json({ isLiveKitConfigured: false });
            return;
        }

        const { roomName, participantName, language } = req.body || {};

        if (!roomName || typeof roomName !== 'string') {
            res.status(400).json({ error: 'roomName is required.' });
            return;
        }
        if (!participantName || typeof participantName !== 'string') {
            res.status(400).json({ error: 'participantName is required.' });
            return;
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
            ttl: '2h',
            metadata: language ? JSON.stringify({ language }) : undefined,
        });

        at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        const token = await at.toJwt();

        res.status(200).json({
            isLiveKitConfigured: true,
            token,
            serverUrl,
        });

    } catch (error: any) {
        console.error('[VAKYA] Error in /api/livekit-token:', error);
        res.status(200).json({
            isLiveKitConfigured: false,
            error: error.message,
        });
    }
}