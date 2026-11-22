import { NextResponse, type NextRequest } from 'next/server';
import { noStore, rejectCrossOrigin } from '@/lib/server/http';
import { clearSessionCookie } from '@/lib/server/session';

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOrigin(request);
  if (blocked) return blocked;

  return clearSessionCookie(noStore(new NextResponse(null, { status: 204 })));
}
