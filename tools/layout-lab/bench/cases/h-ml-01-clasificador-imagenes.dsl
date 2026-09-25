Responsable de producto: (start Necesidad de clasificar imágenes)
Responsable de producto: Definir caso de uso
[Especificación del caso de uso]
(send Requisitos del modelo)
(receive Modelo desplegado)
Responsable de producto: Validar el modelo con usuarios piloto
(finish Clasificador en uso)

Científico de datos: (receive Requisitos del modelo)
Científico de datos: Recopilar imágenes
(send Lote sin etiquetar)
(receive Lote etiquetado)
Científico de datos: Validar calidad de etiquetas
[Conjunto de datos etiquetado]
Científico de datos: Entrenar modelo
Científico de datos: Evaluar modelo
¿Supera el umbral de precisión?
Sí
Ingeniero de MLOps: Empaquetar modelo
Ingeniero de MLOps: Desplegar modelo en producción
(send Modelo desplegado)

Científico de datos: (receive Requisitos del modelo)
Científico de datos: Recopilar imágenes
(send Lote sin etiquetar)
(receive Lote etiquetado)
Científico de datos: Validar calidad de etiquetas
Científico de datos: Entrenar modelo
Científico de datos: Evaluar modelo
¿Supera el umbral de precisión?
No
Científico de datos: Ajustar hiperparámetros
Científico de datos: Entrenar modelo

Anotadores: (receive Lote sin etiquetar)
//Doble anotación por imagen
Anotadores: Etiquetar imágenes
Anotadores: Resolver desacuerdos entre anotadores
(send Lote etiquetado)

== pools ==
Cliente interno -> Responsable de producto
Equipo de ML -> Científico de datos; Ingeniero de MLOps
Proveedor de etiquetado -> Anotadores
