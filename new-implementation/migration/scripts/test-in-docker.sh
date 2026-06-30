#!/usr/bin/env bash
# Run the migration test suite in Docker (the repo has no host Node).
#
#   ./scripts/test-in-docker.sh            # everything (unit + e2e)
#   ./scripts/test-in-docker.sh src        # unit only (no containers)
#
# e2e specs boot real MySQL via Testcontainers, so this mounts the docker
# socket and uses host networking (so mapped container ports are reachable),
# and installs a docker CLI inside node:20-slim. Run from the migration dir.
set -euo pipefail

TARGET="${1:-}"
# Mount the parent (new-implementation) so the provisioner can read
# ../backend/src/database/migrations at runtime.
PARENT="$(cd "$(dirname "$0")/.." && pwd)"          # .../migration
WORK="$(cd "$PARENT/.." && pwd)"                     # .../new-implementation

docker run --rm \
  -v "$WORK":/work -w /work/migration \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --network host \
  -e TESTCONTAINERS_RYUK_DISABLED=true \
  node:20-slim bash -c "
    if [ ! -d node_modules ]; then npm install --no-audit --no-fund; fi
    if [ -z '${TARGET}' ]; then
      apt-get update >/dev/null 2>&1 && apt-get install -y docker.io >/dev/null 2>&1
    fi
    npx vitest run ${TARGET}
  "
