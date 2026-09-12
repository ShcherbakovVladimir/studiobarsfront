#!/bin/bash
set -e

PROJECT_DIR="$HOME/projects/studioxlam"
BUILD_DIR="$HOME/projects/frontend_build"
PROD_DIR="/var/www/studioxlam/frontend_build"
GITHUB_REMOTE="https://github.com/ShcherbakovVladimir/studiobarsfront.git"
TOKEN_FILE="$HOME/.github_pat"
ASKPASS="$HOME/.github_askpass"

log() {
    echo ""
    echo "==> [$(date +%H:%M:%S)] $*"
}

if [ ! -s "$TOKEN_FILE" ] || [ ! -r "$TOKEN_FILE" ]; then
    echo "Нет читаемого GitHub-токена: $TOKEN_FILE" >&2
    echo "Файл должен принадлежать $(id -un) и быть chmod 600." >&2
    exit 1
fi

if [ ! -x "$ASKPASS" ]; then
    echo "Нет исполняемого $ASKPASS" >&2
    exit 1
fi

# Non-interactive GitHub HTTPS: never prompt Username/Password
export GIT_ASKPASS="$ASKPASS"
export SSH_ASKPASS="$ASKPASS"
export GIT_TERMINAL_PROMPT=0
export GIT_CONFIG_COUNT=1
export GIT_CONFIG_KEY_0="credential.helper"
export GIT_CONFIG_VALUE_0=""

github_git() {
    git -c credential.helper= -c "core.askPass=$ASKPASS" "$@"
}

cd "$PROJECT_DIR"

if git remote | grep -q origin; then
    git remote set-url origin "$GITHUB_REMOTE"
else
    git remote add origin "$GITHUB_REMOTE"
fi
echo "    origin -> $GITHUB_REMOTE"

log "1/6 Checking git repository..."
if github_git ls-remote --heads origin >/dev/null 2>&1; then
    echo "    Pulling latest code from origin..."
    github_git pull --ff-only origin "$(git rev-parse --abbrev-ref HEAD)" || echo "    git pull skipped (no upstream or diverged)"
else
    echo "    Remote not reachable yet or empty — skipping git pull"
fi

log "2/6 Installing dependencies (npm install)..."
npm install

log "3/6 Building production (npm run build)..."
echo "    Vite prints its own progress; this step can take a few minutes."
npm run build

log "4/6 Deploying to nginx root..."
echo "    $BUILD_DIR -> $PROD_DIR"
sudo rm -rf "$PROD_DIR"/*
sudo cp -r "$BUILD_DIR"/* "$PROD_DIR"/
sudo chown -R www-data:www-data "$PROD_DIR"
sudo chmod -R 755 "$PROD_DIR"

log "5/6 Reloading nginx..."
sudo systemctl reload nginx

log "6/6 Pushing to GitHub..."
echo "    $GITHUB_REMOTE"
git add -A
if git diff --cached --quiet && git diff --quiet; then
    echo "    No local changes to commit."
else
    if git diff --cached --quiet; then
        echo "    Nothing staged after git add (check .gitignore)."
    else
        git commit -m "deploy: frontend $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    fi
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if github_git push -u origin "$branch"; then
    echo "    Pushed $branch to origin."
else
    echo "    GitHub push failed. Проверьте PAT: repo или contents:write." >&2
    exit 1
fi

echo ""
echo "==> [$(date +%H:%M:%S)] Deployment finished successfully."
