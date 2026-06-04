import { NextRequest, NextResponse } from 'next/server';

// Soft passcode guard for the internal Studio Tools APIs.
// Compares the x-studio-passcode header against the configured passcode.
// Falls back to the public default if the env var is unset (keeps dev working).
const PASSCODE =
  process.env.STUDIO_TOOLS_PASSCODE ||
  process.env.NEXT_PUBLIC_STUDIO_TOOLS_PASSCODE ||
  'vual-studio';

/** Returns a 401 response if the passcode is missing/wrong, otherwise null. */
export function checkStudioPasscode(req: NextRequest): NextResponse | null {
  const provided = req.headers.get('x-studio-passcode');
  if (provided !== PASSCODE) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
