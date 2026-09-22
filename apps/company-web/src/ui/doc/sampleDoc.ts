/**
 * Sample ProcessDoc JSON matching the bundled Onboarding sample diagram, used by
 * the "Usar ejemplo" button so the user can preview the Word output without
 * round-tripping through an external AI first.
 */
export const SAMPLE_DOC_JSON = `{
  "meta": { "title": "Documentación del proceso de incorporación", "processName": "Incorporación de nuevo empleado" },
  "glossary": [
    { "term": "Alta", "definition": "Registro de un nuevo empleado en los sistemas de la empresa." },
    { "term": "Kit de hardware", "definition": "Conjunto de equipo informático (portátil, accesorios) asignado al nuevo empleado." },
    { "term": "Orientación", "definition": "Sesión inicial de bienvenida y formación para el nuevo empleado." },
    { "term": "RRHH", "definition": "Departamento de Recursos Humanos, responsable de la gestión de personas." }
  ],
  "actors": [
    {
      "pool": "HR",
      "actors": [
        { "name": "Responsable de RRHH", "role": "Gestión de personas", "description": "Coordina el alta administrativa y la bienvenida del nuevo empleado." }
      ]
    },
    {
      "pool": "IT",
      "actors": [
        { "name": "Técnico de IT", "role": "Soporte informático", "description": "Prepara y entrega el equipo y los accesos del nuevo empleado." }
      ]
    }
  ],
  "activities": [
    {
      "lane": "HR",
      "items": [
        {
          "number": 1,
          "name": "Send welcome email",
          "description": "RRHH envía un correo de bienvenida con la información clave del primer día.",
          "input": "Aceptación de la oferta por parte del candidato.",
          "output": "Correo de bienvenida enviado al nuevo empleado.",
          "indicators": "Tiempo entre la aceptación y el envío del correo.",
          "improvements": "Plantilla automatizada disparada al firmar el contrato."
        },
        {
          "number": 2,
          "name": "Create accounts",
          "description": "Se solicitan y crean las cuentas corporativas del empleado.",
          "input": "Datos personales y rol del empleado.",
          "output": "Cuentas de correo y sistemas creadas.",
          "indicators": "Número de cuentas creadas sin incidencias.",
          "improvements": "Aprovisionamiento automático mediante el directorio corporativo."
        },
        {
          "number": 3,
          "name": "Schedule orientation",
          "description": "RRHH agenda la sesión de orientación del primer día.",
          "input": "Calendario del equipo y disponibilidad del empleado.",
          "output": "Sesión de orientación agendada.",
          "indicators": "% de empleados con orientación agendada antes del alta.",
          "improvements": "Reserva automática de sala y convocatoria de asistentes."
        }
      ]
    },
    {
      "lane": "IT",
      "items": [
        {
          "number": 4,
          "name": "Prepare hardware kit",
          "description": "IT prepara el equipo informático y los accesorios del nuevo empleado.",
          "input": "Rol del empleado y catálogo de equipo estándar.",
          "output": "Kit de hardware preparado y listo para entregar.",
          "indicators": "Tiempo de preparación del kit por empleado.",
          "improvements": "Stock mínimo de kits preconfigurados por perfil."
        }
      ]
    }
  ]
}`;
