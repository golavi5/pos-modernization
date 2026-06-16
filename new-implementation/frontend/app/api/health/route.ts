// Liveness probe for the Next.js container. The frontend Dockerfile's
// HEALTHCHECK and the compose healthcheck hit this. Keep it dependency-free
// (does NOT call the backend) so frontend health reflects only the frontend.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { status: 'ok', timestamp: new Date().toISOString() },
    { status: 200 },
  );
}
