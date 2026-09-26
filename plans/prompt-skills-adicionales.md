# Prompt para trabajar en las skills adicionales

Copia el bloque de abajo al empezar una conversación nueva en este repositorio (Claude Code, Codex…). Sustituye `<MEJORA>` por la que quieras abordar (1, 2, 3 o 4 de `plans/mejoras-futuras.md`) o déjalo tal cual para que te proponga el orden.

---

```text
Vamos a empezar las mejoras futuras de la skill BPMN. Trabaja en el repositorio ignagp34/Skill-BPMN-v2 (clon en C:/Repositorios/Skill BPMN v2/Skill-BPMN-v2, rama main), desde la raíz del clon.

Antes de nada, lee:
1. AGENTS.md: única fuente de instrucciones; CLAUDE.md solo redirige.
2. El primer resumen de CONTINUAR.md (estado vigente).
3. plans/mejoras-futuras.md: diseño de las cuatro mejoras, con su flujo, registro, restricciones y criterios de aceptación.
4. skills/bpmn/SKILL.md y skills/bpmn/references/contract.md: el contrato de la skill que reutilizas.

Mejora que abordamos: <MEJORA>.
Si pone <MEJORA>, propón el orden y espera mi confirmación. Mi preferencia provisional es 1 (skill bpmn-edit), porque la 2 depende de ella; después la 4 (evaluación de modelos) y la 3 si la 2 resulta cara.

Cómo quiero que trabajes:
- Una mejora cada vez. Primero, un plan corto en plans/<mejora>.md: módulos, archivos, comandos, pruebas y qué se reutiliza. Espera mi visto bueno antes de implementar si hay una decisión que me toque (por ejemplo, conservar o no las ediciones de geometría al cambiar el DSL en bpmn-edit).
- Cada skill nueva va en skills/<nombre>/, con SKILL.md breve, references/ de lectura selectiva, scripts/ y config/ en JSON. Sigue la misma organización SOLID que skills/bpmn: un comando por archivo en scripts/commands/, una responsabilidad por módulo en scripts/lib/, y la configuración separada del código y en un único lugar por decisión.
- Reutiliza, no copies. El motor, el harness y los exportadores se usan como hoy usa bpmn: skills/bpmn/scripts/lib/harness.mjs, artifacts.mjs, run-store.mjs, layouts.mjs y message-flows.mjs. El motor se localiza con BPMN_SKILL_ENGINE_ROOT o el enlace de la instalación. El servidor local sigue el patrón de tools/layout-lab/commands/vote.mjs: 127.0.0.1, puerto libre, guardado inmediato en JSON y cierre garantizado. Para bpmn-edit, el antecedente es apps/company-web (src/ui/screens/Editor.tsx y src/ui/app.ts, con stripMessageFlows y renderSemanticXml).
- El layout de partida es siempre el `default` de skills/bpmn/config/layouts.json (léelo allí, no lo supongas), registrado por versión. `--layout v0` sigue siendo el TFM exacto. El banco tiene 55 casos: f-s17-document-approval está excluido.
- Todo en local, sin API keys ni servicios externos. Las rutas de Windows con espacios deben funcionar. Las salidas van siempre a carpetas nuevas (nunca a TFM-eval/results/ ni sobre ejecuciones anteriores).
- Modelos: nunca afirmes que usaste un modelo que no usaste (matchesRequested). No crees tareas en la barra lateral para simular subagentes. Si un host no permite elegir el modelo, dilo.

Límites que no se tocan:
- BPMN-DSL-Monorepo (carpeta padre) es referencia protegida: no escribir en él.
- No modificar el motor congelado ni THIRD-PARTY-NOTICES.md. Deben seguir pasando `node smoke/verify-source.mjs` (3319/0), `node --test tools/layout-lab/test/layout-lab.test.mjs` y la paridad `node tools/skill-parity/parity.mjs skill-runs/parity-<fecha>`. Lanza la paridad sola, no a la vez que otros renders.
- No editar módulos compartidos del harness con un render en marcha.
- Commits locales sí, con mensajes como los del historial. Push solo si te lo pido expresamente, comprobando antes que origin es ignagp34/Skill-BPMN-v2.

Al terminar cada paso:
- Evidencia en evidence/<mejora>/REPORT.md, con los comandos ejecutados y los resultados reales, sin confundir lectura de código con pruebas hechas.
- Una entrada breve en AGENTS.md (sección de la mejora) y un resumen nuevo al principio de CONTINUAR.md.
- Marca los criterios de aceptación de plans/mejoras-futuras.md solo con evidencia y dime qué queda en mis manos (por ejemplo, probar la página y editar un diagrama).

Responde en español. Si te pido «varios a la vez», avanza en paralelo en lo que sea independiente (renders, pruebas, redacción) y avísame de en qué estás.
```
