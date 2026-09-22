/**
 * Builds the doc-generation prompt the user copies into an external AI. The
 * prompt itself is in English, but it instructs the model to write the
 * documentation in the SAME language as the process (so a Spanish diagram
 * yields Spanish documentation). It embeds the app-generated skeleton and pins
 * the exact JSON contract so the pasted response can be parsed deterministically
 * by parseProcessDoc.
 */
import type { DocSkeleton } from "./skeleton.js";
import { renderSkeletonText } from "./skeleton.js";

export function buildDocPrompt(skeleton: DocSkeleton): string {
  const skeletonText = renderSkeletonText(skeleton);
  const poolList = skeleton.pools.map((p) => `- ${p}`).join("\n");

  return `You are a business process consultant. From the process SCHEMA below (lanes/actors and their activities, already numbered and ordered chronologically), write the process documentation.

LANGUAGE: Write ALL of the documentation in the SAME language as the activity and lane names in the SCHEMA. If they are in Spanish, write everything in Spanish; if they are in English, write everything in English; and so on. Do NOT translate the diagram — match its language.

Return EXCLUSIVELY a single \`\`\`json code block with an object that follows EXACTLY this contract (the keys stay in English, the values are written in the diagram's language):

\`\`\`json
{
  "meta": { "title": "Process documentation", "processName": "Process name" },
  "glossary": [
    { "term": "Term or acronym", "definition": "Brief, clear definition" }
  ],
  "actors": [
    {
      "pool": "Pool/lane name",
      "actors": [
        { "name": "Actor or role", "role": "Job title or function", "description": "Responsibility within the process" }
      ]
    }
  ],
  "activities": [
    {
      "lane": "Lane name",
      "items": [
        {
          "number": 1,
          "name": "Exact activity name",
          "description": "What is done and how",
          "input": "Required inputs (documents, data, triggers)",
          "output": "Outputs or results produced",
          "indicators": "Relevant indicators (KPIs) to measure the activity",
          "improvements": "Relevant improvement actions you propose"
        }
      ]
    }
  ]
}
\`\`\`

MANDATORY RULES:
1. Keep the activity names ("name") and numbers ("number") exactly as they appear in the SCHEMA. Do not change them, do not reorder them, do not invent new activities and do not remove any.
2. Group the activities by lane, respecting the same lane order as the SCHEMA. Each lane in the schema must appear exactly once in "activities".
3. In "actors" include one group for each pool/lane in this list (even if it has no activities):
${poolList}
4. The glossary must capture the technical terms, acronyms and relevant concepts that appear in the process, sorted alphabetically.
5. Write every value (definitions, descriptions, inputs, outputs, indicators, improvements) professionally and concisely, in the diagram's language (see LANGUAGE above).
6. Reply with a SINGLE \`\`\`json block and nothing else (no explanations before or after).

PROCESS SCHEMA:
${skeletonText}
`;
}
