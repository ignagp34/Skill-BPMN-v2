#!/usr/bin/env bash
# Instala todas las skills de skills/ (bpmn, bpmn-edit, bpmn-tobe…) para Claude Code a nivel de usuario (~/.claude),
# de modo que funcionen en cualquier proyecto, también en sesiones de Claude Code en la nube.
#
#   bash scripts/install-skill.sh            # usa este checkout como motor
#   bash install-skill.sh --clone            # clona/actualiza el repositorio en $BPMN_SKILL_HOME
#   --no-link                                # no enlaza ~/.claude/skills (lo usa skills/bpmn-claude-ai)
#
# Idempotente: se puede ejecutar en cada arranque (script de configuración del entorno cloud).
# Variables: BPMN_SKILL_HOME (destino del clon, por defecto ~/.bpmn-skill/Skill-BPMN-v2),
# BPMN_SKILL_REPO (URL), BPMN_SKILL_REF (rama, por defecto main).
set -euo pipefail

REPO_URL="${BPMN_SKILL_REPO:-https://github.com/ignagp34/Skill-BPMN-v2.git}"
REF="${BPMN_SKILL_REF:-main}"
CLAUDE_DIR="$HOME/.claude"
log() { printf '[bpmn-skill] %s\n' "$*" >&2; }

CLONE=0; LINK=1
for arg in "$@"; do
  case "$arg" in
    --clone) CLONE=1 ;;
    --no-link) LINK=0 ;;
    *) log "Opción desconocida: $arg"; exit 64 ;;
  esac
done

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd || true)"
if [[ $CLONE == 0 && -f "$here/pnpm-workspace.yaml" && -f "$here/skills/bpmn/SKILL.md" ]]; then
  ROOT="$here"
else
  ROOT="${BPMN_SKILL_HOME:-$HOME/.bpmn-skill/Skill-BPMN-v2}"
  if [[ -d "$ROOT/.git" ]]; then
    log "Actualizando $ROOT ($REF)"
    git -C "$ROOT" fetch --depth 1 origin "$REF" && git -C "$ROOT" checkout -q -B "$REF" FETCH_HEAD
  else
    log "Clonando $REPO_URL ($REF) en $ROOT"
    mkdir -p "$(dirname "$ROOT")"
    git clone -q --depth 1 --branch "$REF" "$REPO_URL" "$ROOT"
  fi
fi
log "Motor: $ROOT"

# Dependencias del motor, fijadas por el lockfile.
if ! command -v pnpm >/dev/null 2>&1; then
  log "pnpm no está instalado; se activa con corepack"
  corepack enable >/dev/null 2>&1 || npm install -g pnpm@11 >/dev/null
fi
(cd "$ROOT" && pnpm install --frozen-lockfile --reporter=silent)

# Chromium de la versión de Playwright del lockfile. Si PLAYWRIGHT_BROWSERS_PATH ya existe
# (p. ej. /opt/pw-browsers en la nube) se instala ahí la revisión que falte; si no, en <motor>/.playwright.
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-$ROOT/.playwright}"
# Si la red no permite descargarlo, la skill usa BPMN_SKILL_CHROMIUM o $PLAYWRIGHT_BROWSERS_PATH/chromium.
node "$ROOT/apps/tfm-lab/node_modules/playwright/cli.js" install chromium >/dev/null 2>&1 \
  || log "No se pudo descargar el Chromium de Playwright; se usará el del entorno si lo hay (doctor lo comprueba)"

# Skills a nivel de usuario: enlaces a este checkout, para que el motor se localice solo.
if [[ $LINK == 1 ]]; then
  mkdir -p "$CLAUDE_DIR/skills"
  # Todas las skills del repositorio (skills/*/SKILL.md), salvo el índice para claude.ai.
  for dir in "$ROOT"/skills/*/; do
    skill="$(basename "$dir")"
    [[ -f "$dir/SKILL.md" && "$skill" != "bpmn-claude-ai" ]] || continue
    target="$CLAUDE_DIR/skills/$skill"
    if [[ -e "$target" && ! -L "$target" ]]; then
      backup="$target.backup-$(date +%Y%m%d%H%M%S)"
      log "Ya existe $target (no es un enlace); se mueve a $backup"
      mv "$target" "$backup"
    fi
    ln -sfn "$ROOT/skills/$skill" "$target"
  done
fi

# Subagente generador (modelo y esfuerzo de config/generators.json) a nivel de usuario.
node "$ROOT/skills/bpmn/scripts/bpmn.mjs" sync-agents --target "$HOME" >/dev/null

node "$ROOT/skills/bpmn/scripts/bpmn.mjs" doctor
