Radiólogo: (start Estudio clínico propuesto)
Comité de ética: Aprobar protocolo del estudio
Radiólogo: Seleccionar radiografías anonimizadas
[Radiografías anonimizadas]
(send Conjunto de imágenes clínicas)
(receive Informe de validación clínica)
Radiólogo: Contrastar predicciones con diagnósticos reales
(finish Estudio clínico completado)

Ingeniero de visión: (receive Conjunto de imágenes clínicas)
Ingeniero de visión: Entrenar red convolucional
Ingeniero de visión: Generar mapas de calor de explicabilidad
Ingeniero de visión: Validar sensibilidad y especificidad
(send Informe de validación clínica)
Responsable regulatorio: Preparar expediente técnico
[Expediente técnico]
(send Solicitud de marcado CE)
(receive Resolución regulatoria)
¿Se concede el marcado CE?
Sí
Responsable regulatorio: Lanzar el producto en hospitales
(finish Producto certificado)

...
Ingeniero de visión: Entrenar red convolucional
(exception Fallo de convergencia)
Ingeniero de visión: Aumentar datos y reiniciar entrenamiento
Ingeniero de visión: Entrenar red convolucional
...

Ingeniero de visión: (receive Conjunto de imágenes clínicas)
Ingeniero de visión: Entrenar red convolucional
Ingeniero de visión: Generar mapas de calor de explicabilidad
Ingeniero de visión: Validar sensibilidad y especificidad
(send Informe de validación clínica)
Responsable regulatorio: Preparar expediente técnico
(send Solicitud de marcado CE)
(receive Resolución regulatoria)
¿Se concede el marcado CE?
No
Responsable regulatorio: Archivar el expediente
(error Certificación denegada)

Evaluador: (receive Solicitud de marcado CE)
Evaluador: Auditar el expediente técnico
Evaluador: Emitir resolución
(send Resolución regulatoria)

== pools ==
Hospital -> Radiólogo; Comité de ética
Startup de IA -> Ingeniero de visión; Responsable regulatorio
Organismo notificado -> Evaluador
