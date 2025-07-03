import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

// Do not cache endpoint result
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');
  const makeUnique = req.nextUrl.searchParams.get('makeUnique') === 'true'; // Whether to make identity unique
  
  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  } else if (!username) {
    return NextResponse.json({ error: 'Missing "username" query parameter' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Create unique identity if requested (for regular participants to prevent collisions)
  const identity = makeUnique 
    ? `${username}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
    : username;

  const at = new AccessToken(apiKey, apiSecret, { identity });
  at.addGrant({ 
    room, 
    roomJoin: true, 
    canPublish: true, 
    canSubscribe: true,
    canUpdateOwnMetadata: true  // Allow participants to update their own metadata
  });

  return NextResponse.json(
    { token: await at.toJwt() },
    { headers: { "Cache-Control": "no-store" } },
  );
} 