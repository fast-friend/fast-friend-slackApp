#!/bin/bash

ROOT="$(cd "$(dirname "$0")" && pwd)"

trap 'echo ""; echo "Stopping all services..."; kill $(jobs -p) 2>/dev/null; exit' SIGINT SIGTERM

echo "Starting Fast Friends dev environment..."
echo ""

(cd "$ROOT/server" && npm run dev) &
(cd "$ROOT/client" && npm run dev) &
ngrok http --domain=clamp-placard-smuggler.ngrok-free.dev 5001 &

echo "  Backend:  http://localhost:5001"
echo "  Frontend: http://localhost:5173"
echo "  Tunnel:   https://clamp-placard-smuggler.ngrok-free.dev"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

wait
