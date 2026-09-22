/**
 * The JSON contract the external AI must return, and a tolerant runtime
 * validator for the pasted text. The shape mirrors the three document
 * sections: Glosario, Actores, Fichas de actividad.
 */

export type GlossaryEntry = {
  term: string;
  definition: string;
};

export type ActorEntry = {
  name: string;
  role: string;
  description: string;
};

export type ActorGroup = {
  /** Pool / swimlane the actors belong to. */
  pool: string;
  actors: ActorEntry[];
};

export type ActivitySheet = {
  number: number;
  name: string;
  description: string;
  input: string;
  output: string;
  indicators: string;
  improvements: string;
};

export type ActivityLane = {
  /** Lane / main actor whose activity sheets are grouped here. */
  lane: string;
  items: ActivitySheet[];
};

export type ProcessDoc = {
  meta: { title: string; processName: string };
  glossary: GlossaryEntry[];
  actors: ActorGroup[];
  activities: ActivityLane[];
};

export type ParseDocResult = { doc: ProcessDoc; error?: undefined } | { doc?: undefined; error: string };

/** Strip a leading ```json (or ```) fence and trailing ``` if present. */
function stripFences(raw: string): string {
  let text = raw.trim();
  const fenceStart = text.match(/^```[a-zA-Z]*\s*\n?/);
  if (fenceStart) {
    text = text.slice(fenceStart[0].length);
    const lastFence = text.lastIndexOf("```");
    if (lastFence !== -1) text = text.slice(0, lastFence);
  } else {
    // No leading fence: extract the outermost {...} block if there is extra prose.
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first !== -1 && last > first) text = text.slice(first, last + 1);
  }
  return text.trim();
}

function asString(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((v) => `• ${asString(v)}`).join("\n");
  if (value === null || value === undefined) return "";
  return String(value);
}

/**
 * Parse the pasted AI response into a ProcessDoc. Tolerant of code fences,
 * surrounding prose, and indicators/improvements arriving as arrays instead of
 * strings. Returns a friendly Spanish error message when the shape is wrong.
 */
export function parseProcessDoc(raw: string): ParseDocResult {
  if (raw.trim().length === 0) {
    return { error: "Pega la respuesta JSON del asistente antes de generar el documento." };
  }

  let data: unknown;
  try {
    data = JSON.parse(stripFences(raw));
  } catch (err) {
    return { error: `El texto pegado no es un JSON válido. ${err instanceof Error ? err.message : ""}`.trim() };
  }

  if (typeof data !== "object" || data === null) {
    return { error: "El JSON debe ser un objeto con las claves meta, glossary, actors y activities." };
  }

  const obj = data as Record<string, unknown>;

  const metaIn = (obj.meta ?? {}) as Record<string, unknown>;
  const meta = {
    title: asString(metaIn.title) || "Documentación de proceso",
    processName: asString(metaIn.processName) || asString(metaIn.title) || "Proceso",
  };

  if (!Array.isArray(obj.activities)) {
    return { error: 'Falta el array "activities" (las fichas de actividad agrupadas por lane).' };
  }

  const glossary: GlossaryEntry[] = Array.isArray(obj.glossary)
    ? obj.glossary.map((g) => {
        const e = (g ?? {}) as Record<string, unknown>;
        return { term: asString(e.term), definition: asString(e.definition) };
      })
    : [];

  const actors: ActorGroup[] = Array.isArray(obj.actors)
    ? obj.actors.map((grp) => {
        const e = (grp ?? {}) as Record<string, unknown>;
        const list = Array.isArray(e.actors) ? e.actors : [];
        return {
          pool: asString(e.pool),
          actors: list.map((a) => {
            const ae = (a ?? {}) as Record<string, unknown>;
            return { name: asString(ae.name), role: asString(ae.role), description: asString(ae.description) };
          }),
        };
      })
    : [];

  const activities: ActivityLane[] = obj.activities.map((lane) => {
    const e = (lane ?? {}) as Record<string, unknown>;
    const items = Array.isArray(e.items) ? e.items : [];
    return {
      lane: asString(e.lane),
      items: items.map((it, idx) => {
        const ie = (it ?? {}) as Record<string, unknown>;
        const num = Number(ie.number);
        return {
          number: Number.isFinite(num) ? num : idx + 1,
          name: asString(ie.name),
          description: asString(ie.description),
          input: asString(ie.input),
          output: asString(ie.output),
          indicators: asString(ie.indicators),
          improvements: asString(ie.improvements),
        };
      }),
    };
  });

  const totalItems = activities.reduce((n, l) => n + l.items.length, 0);
  if (totalItems === 0) {
    return { error: "No se encontró ninguna ficha de actividad en el JSON pegado." };
  }

  return { doc: { meta, glossary, actors, activities } };
}
