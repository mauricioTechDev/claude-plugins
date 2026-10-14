#!/usr/bin/env bash
set -euo pipefail
cat > greet.py <<'PY'
def greet(name):
    return None
PY
cat > handoff.md <<'MD'
# Handoff
- **Goal**: greet(name) in greet.py returns "Hello, <name>!".
- **Done**: Created greet.py with the function stub.
- **In progress**: greet.py:2 still returns None.
- **Next**: 1. Make greet() return f"Hello, {name}!".
- **Check**: python3 -c "from greet import greet; print(greet('Ana'))" prints Hello, Ana!
- **Notes**: none.
MD
