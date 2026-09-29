#!/usr/bin/env bash
# Deja listo el motor de las skills BPMN y, en la última línea, imprime un JSON con
# { engine, commit, updated, skills: [{ name, description, skillFile }] }.
# - La primera vez en un equipo o contenedor clona Skill-BPMN-v2 e instala sus dependencias (1–2 min).
# - En cada uso trae lo nuevo de la rama (BPMN_SKILL_REF, por defecto main); si cambió el lockfile,
#   reinstala. Sin red, sigue con la copia que haya.
# - Un checkout ya preparado (BPMN_SKILL_ENGINE_ROOT o el repositorio actual) se usa tal cual, sin tocarlo.
# Los mensajes van a stderr.
set -euo pipefail

REPO_URL="${BPMN_SKILL_REPO:-https://github.com/ignagp34/Skill-BPMN-v2.git}"
REF="${BPMN_SKILL_REF:-main}"
log() { printf '[bpmn-skill] %s\n' "$*" >&2; }
ready() { [[ -f "$1/pnpm-workspace.yaml" && -d "$1/apps/tfm-lab/node_modules/playwright" ]]; }
install() { log "Instalando dependencias del motor"; bash "$1/scripts/install-skill.sh" --no-link >&2; }

ROOT=""; UPDATED=false
for candidate in "${BPMN_SKILL_ENGINE_ROOT:-}" "$(git rev-parse --show-toplevel 2>/dev/null || true)"; do
  if [[ -n "$candidate" && -f "$candidate/skills/bpmn/SKILL.md" ]] && ready "$candidate"; then
    ROOT="$candidate"; break
  fi
done

if [[ -z "$ROOT" ]]; then
  ROOT="${BPMN_SKILL_HOME:-$HOME/.bpmn-skill/Skill-BPMN-v2}"
  if [[ ! -d "$ROOT/.git" ]]; then
    log "Primera ejecución: se descarga el motor en $ROOT"
    mkdir -p "$(dirname "$ROOT")"
    git clone -q --depth 1 --branch "$REF" "$REPO_URL" "$ROOT"
    install "$ROOT"
  else
    before="$(git -C "$ROOT" rev-parse HEAD)"
    if git -C "$ROOT" fetch -q --depth 1 origin "$REF" 2>/dev/null; then
      after="$(git -C "$ROOT" rev-parse FETCH_HEAD)"
      if [[ "$after" != "$before" ]]; then
        log "Actualizando el motor a ${after:0:7}"
        lock_changed="$(git -C "$ROOT" diff --name-only "$before" "$after" -- pnpm-lock.yaml 2>/dev/null || echo changed)"
        git -C "$ROOT" checkout -q -B "$REF" "$after"
        UPDATED=true
        [[ -n "$lock_changed" ]] && install "$ROOT"
      fi
    else
      log "Sin acceso al repositorio; se usa la copia local sin actualizar"
    fi
    ready "$ROOT" || install "$ROOT"
  fi
fi

# Catálogo: todas las skills del repositorio (skills/*/SKILL.md) salvo este índice.
ENGINE="$ROOT" UPDATED="$UPDATED" node --input-type=module -e '
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
const engine = process.env.ENGINE;
const field = (text, key) => (text.match(new RegExp(`^${key}:\\s*(.*)$`, "m")) ?? [])[1]?.trim() ?? "";
const skills = readdirSync(join(engine, "skills"), { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== "bpmn-claude-ai")
  .map(d => join(engine, "skills", d.name, "SKILL.md"))
  .filter(existsSync)
  .map(skillFile => {
    const head = readFileSync(skillFile, "utf8").split(/^---\s*$/m)[1] ?? "";
    return { name: field(head, "name"), description: field(head, "description"), skillFile };
  });
let commit = null;
try { commit = execSync("git rev-parse --short HEAD", { cwd: engine }).toString().trim(); } catch {}
console.log(JSON.stringify({ engine, commit, updated: process.env.UPDATED === "true", skills }));
'
