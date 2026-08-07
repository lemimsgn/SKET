import { firebaseAdminInitError } from '../../../../lib/firebaseAdmin';
import { NextResponse } from 'next/server';

// Safe debug endpoint: returns only whether Admin initialized and a short status message.
// Do NOT return error details to clients; detailed error is logged to server console for developer debugging.
export async function GET() {
  const initialized = !firebaseAdminInitError;
  if (!initialized) {
    // Log full error details to server console only.
    // This helps debugging without exposing secrets to clients.
    // eslint-disable-next-line no-console
    console.error('Firebase Admin initialization error (server):', firebaseAdminInitError);
  }

  return NextResponse.json({ initialized, status: initialized ? 'initialized' : 'not-initialized' });
}
