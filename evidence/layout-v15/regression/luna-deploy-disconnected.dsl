(start Inicio de experimento)
Ciencia de datos: Preparar y dividir datos
[Datos de entrenamiento, validación y prueba]
Ciencia de datos: Definir arquitectura e hiperparámetros
Ciencia de datos: Inicializar pesos
Ciencia de datos: Comenzar época
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
Sí
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
No
Ciencia de datos: Evaluar en validación
¿Se cumple el criterio de parada?
No
Ciencia de datos: Comenzar época
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
Sí
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
No
Ciencia de datos: Evaluar en validación
¿Se cumple el criterio de parada?
Sí
Ciencia de datos: Evaluar métricas en validación
¿Cumplen el umbral acordado?
Sí
Ciencia de datos: Evaluar en prueba
[Modelo evaluado]
Ciencia de datos: Guardar modelo candidato
(send Candidato de modelo)
(finish Candidato entregado a MLOps)

(start Inicio de experimento)
Ciencia de datos: Preparar y dividir datos
[Datos de entrenamiento, validación y prueba]
Ciencia de datos: Definir arquitectura e hiperparámetros
Ciencia de datos: Inicializar pesos
Ciencia de datos: Comenzar época
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
Sí
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
No
Ciencia de datos: Evaluar en validación
¿Se cumple el criterio de parada?
Sí
Ciencia de datos: Evaluar métricas en validación
¿Cumplen el umbral acordado?
No
Ciencia de datos: Ajustar arquitectura o hiperparámetros
Ciencia de datos: Definir arquitectura e hiperparámetros
Ciencia de datos: Inicializar pesos
Ciencia de datos: Comenzar época
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
Sí
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
No
Ciencia de datos: Evaluar en validación
¿Se cumple el criterio de parada?
Sí
Ciencia de datos: Evaluar métricas en validación
¿Cumplen el umbral acordado?
Sí
Ciencia de datos: Evaluar en prueba
[Modelo evaluado]
Ciencia de datos: Guardar modelo candidato
(send Candidato de modelo)
(finish Candidato entregado tras ajuste)

(receive Solicitud de corrección)
Ciencia de datos: Corregir experimento
Ciencia de datos: Ajustar arquitectura o hiperparámetros
Ciencia de datos: Definir arquitectura e hiperparámetros
Ciencia de datos: Inicializar pesos
Ciencia de datos: Comenzar época
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
Sí
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
No
Ciencia de datos: Evaluar en validación
¿Se cumple el criterio de parada?
Sí
Ciencia de datos: Evaluar métricas en validación
¿Cumplen el umbral acordado?
Sí
Ciencia de datos: Evaluar en prueba
[Modelo evaluado]
Ciencia de datos: Guardar modelo candidato
(send Candidato de modelo)
(finish Candidato corregido entregado)

(receive Candidato de modelo)
Plataforma: Registrar versión, datos y métricas
[db Registro de modelos]
Plataforma: Ejecutar pruebas de integración y validar despliegue
¿Pasan las pruebas y la validación?
No
(send Solicitud de corrección)
(finish Candidato devuelto para corrección)

(receive Candidato de modelo)
Plataforma: Registrar versión, datos y métricas
[db Registro de modelos]
Plataforma: Ejecutar pruebas de integración y validar despliegue
¿Pasan las pruebas y la validación?
Sí
Plataforma: Desplegar gradualmente
¿El despliegue degrada el servicio?
Sí
Plataforma: Revertir a la versión anterior
(send Solicitud de corrección)
(finish Servicio revertido y corrección solicitada)

(receive Candidato de modelo)
Plataforma: Registrar versión, datos y métricas
[db Registro de modelos]
Plataforma: Ejecutar pruebas de integración y validar despliegue
¿Pasan las pruebas y la validación?
Sí
Plataforma: Desplegar gradualmente
¿El despliegue degrada el servicio?
No
Plataforma: Recibir solicitud de inferencia
Plataforma: Aplicar preprocesamiento de entrenamiento
Plataforma: Propagar hacia delante y devolver predicción
Plataforma: Monitorizar calidad, latencia y deriva
¿El servicio sigue activo?
Sí
Plataforma: Recibir solicitud de inferencia
Plataforma: Aplicar preprocesamiento de entrenamiento
Plataforma: Propagar hacia delante y devolver predicción
Plataforma: Monitorizar calidad, latencia y deriva
¿Se detecta degradación o deriva relevante?
No
¿El servicio sigue activo?
No
Plataforma: Retirar servicio
(finish Servicio retirado)

(receive Candidato de modelo)
Plataforma: Registrar versión, datos y métricas
[db Registro de modelos]
Plataforma: Ejecutar pruebas de integración y validar despliegue
¿Pasan las pruebas y la validación?
Sí
Plataforma: Desplegar gradualmente
¿El despliegue degrada el servicio?
No
Plataforma: Recibir solicitud de inferencia
Plataforma: Aplicar preprocesamiento de entrenamiento
Plataforma: Propagar hacia delante y devolver predicción
Plataforma: Monitorizar calidad, latencia y deriva
¿El servicio sigue activo?
Sí
Plataforma: Recibir solicitud de inferencia
Plataforma: Aplicar preprocesamiento de entrenamiento
Plataforma: Propagar hacia delante y devolver predicción
Plataforma: Monitorizar calidad, latencia y deriva
¿Se detecta degradación o deriva relevante?
Sí
(send Solicitud de reentrenamiento)
(receive Candidato de modelo)
Plataforma: Registrar nueva versión, datos y métricas
[db Registro de modelos]
Plataforma: Ejecutar pruebas de integración y validar despliegue
¿Pasan las pruebas y la validación?
Sí
Plataforma: Desplegar gradualmente
¿El despliegue degrada el servicio?
No
Plataforma: Recibir solicitud de inferencia
Plataforma: Aplicar preprocesamiento de entrenamiento
Plataforma: Propagar hacia delante y devolver predicción
Plataforma: Monitorizar calidad, latencia y deriva
¿El servicio sigue activo?
No
Plataforma: Retirar servicio
(finish Servicio reentrenado y retirado)

(receive Candidato de modelo)
Plataforma: Registrar versión, datos y métricas
[db Registro de modelos]
Plataforma: Ejecutar pruebas de integración y validar despliegue
¿Pasan las pruebas y la validación?
Sí
Plataforma: Desplegar gradualmente
¿El despliegue degrada el servicio?
No
Plataforma: Recibir solicitud de inferencia
Plataforma: Aplicar preprocesamiento de entrenamiento
Plataforma: Propagar hacia delante y devolver predicción
Plataforma: Monitorizar calidad, latencia y deriva
¿El servicio sigue activo?
Sí
Plataforma: Recibir solicitud de inferencia
Plataforma: Aplicar preprocesamiento de entrenamiento
Plataforma: Propagar hacia delante y devolver predicción
Plataforma: Monitorizar calidad, latencia y deriva
¿Se detecta degradación o deriva relevante?
Sí
(send Solicitud de reentrenamiento)
(finish Solicitud de reentrenamiento enviada)

(receive Solicitud de reentrenamiento)
Ciencia de datos: Corregir experimento
Ciencia de datos: Ajustar arquitectura o hiperparámetros
Ciencia de datos: Definir arquitectura e hiperparámetros
Ciencia de datos: Inicializar pesos
Ciencia de datos: Comenzar época
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
Sí
Ciencia de datos: Obtener mini-batch
Ciencia de datos: Propagar hacia delante por las capas
Ciencia de datos: Calcular pérdida
Ciencia de datos: Retropropagar gradientes
Ciencia de datos: Actualizar pesos con el optimizador
¿Quedan mini-batches?
No
Ciencia de datos: Evaluar en validación
¿Se cumple el criterio de parada?
Sí
Ciencia de datos: Evaluar métricas en validación
¿Cumplen el umbral acordado?
Sí
Ciencia de datos: Evaluar en prueba
[Modelo evaluado]
Ciencia de datos: Guardar modelo candidato
(send Candidato de modelo)
(finish Nueva versión candidata entregada)

== pools ==
Experimentación -> Ciencia de datos
MLOps -> Plataforma