#!/usr/bin/env bash
# Run LaundryOS migrations + seed via Supabase CLI Management API.
#
# Requires: SUPABASE_ACCESS_TOKEN env var (Personal Access Token)
#   Get one at: https://supabase.com/dashboard/account/tokens
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_xxx bash scripts/migrate.sh

set -euo pipefail

PROJECT_REF="ktsgugnxndvdiufhntxl"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: SUPABASE_ACCESS_TOKEN is not set."
  echo ""
  echo "1. Go to: https://supabase.com/dashboard/account/tokens"
  echo "2. Click 'Generate new token', name it 'LaundryOS-CLI'"
  echo "3. Copy the token and run:"
  echo "   SUPABASE_ACCESS_TOKEN=sbp_xxx bash scripts/migrate.sh"
  exit 1
fi

# Link this project to the Supabase CLI (uses SUPABASE_ACCESS_TOKEN automatically)
echo "→ Linking project $PROJECT_REF..."
cd "$REPO_ROOT"
npx supabase link --project-ref "$PROJECT_REF" 2>&1 || true

FILES=(
  "supabase/migrations/001_foundation.sql"
  "supabase/migrations/002_phase1_seed.sql"
  "supabase/migrations/003_phase2_operations.sql"
  "supabase/migrations/004_phase3_delivery_subscriptions.sql"
  "supabase/migrations/005_phase4_api_keys.sql"
  "supabase/seed.sql"
)

echo ""
echo "Running ${#FILES[@]} SQL files..."
echo ""

for f in "${FILES[@]}"; do
  label="$(basename "$f")"
  printf "  → %-40s " "$label"
  npx supabase db query --linked --file "$REPO_ROOT/$f" > /dev/null 2>&1 && echo "✓" || {
    echo "✗"
    echo ""
    echo "Failed on $f. Running with verbose output:"
    npx supabase db query --linked --file "$REPO_ROOT/$f"
    exit 1
  }
done

echo ""
echo "All migrations applied successfully!"
echo ""
echo "Demo login:"
echo "  Email:    demo@alnoor.kw"
echo "  Password: Demo1234!"
