#!/usr/bin/env bash
# Deja listo el motor de la skill bpmn e imprime su ruta en la última línea.
# La primera vez en un contenedor clona Skill-BPMN-v2 e instala sus dependencias (1–2 min);
# después solo comprueba. Los mensajes van a stderr.
set -euo pipefail

log() { printf '[bpmn-skill] %s\n' "$*" >&2; }
ready() { [[ -f "$1/pnpm-workspace.yaml" && -d "$1/apps/tfm-lab/node_modules/playwright" ]]; }

# Un checkout ya preparado tiene prioridad: BPMN_SKILL_ENGINE_ROOT o el repositorio actual.
for candidate in "${BPMN_SKILL_ENGINE_ROOT:-}" "$(git rev-parse --show-toplevel 2>/dev/null || true)"; do
  if [[ -n "$candidate" && -f "$candidate/skills/bpmn/SKILL.md" ]] && ready "$candidate"; then
    echo "$candidate"; exit 0
  fi
done

ROOT="${BPMN_SKILL_HOME:-$HOME/.bpmn-skill/Skill-BPMN-v2}"
if ! ready "$ROOT"; then
  if [[ ! -d "$ROOT/.git" ]]; then
    log "Primera ejecución: se descarga el motor en $ROOT"
    mkdir -p "$(dirname "$ROOT")"
    git clone -q --depth 1 --branch "${BPMN_SKILL_REF:-main}" \
      "${BPMN_SKILL_REPO:-https://github.com/ignagp34/Skill-BPMN-v2.git}" "$ROOT"
  fi
  log "Instalando dependencias del motor"
  bash "$ROOT/scripts/install-skill.sh" --no-link >&2
fi
echo "$ROOT"
