Detector de deriva: (timer Cada día a las 02:00)
service Calcular distribución de las variables de entrada
service Comparar con la distribución de entrenamiento
¿Se detecta deriva significativa?
No
(finish Modelo estable)

Detector de deriva: (timer Cada día a las 02:00)
service Calcular distribución de las variables de entrada
service Comparar con la distribución de entrenamiento
¿Se detecta deriva significativa?
Sí
(send Alerta de deriva)

Científico de datos: (receive Alerta de deriva)
Científico de datos: Analizar causas de la deriva
Científico de datos: Reentrenar con datos recientes
[Modelo reentrenado]
Revisor: Comparar modelo nuevo con el actual en backtesting
¿El modelo nuevo es mejor?
Sí
(send Propuesta de sustitución)
(receive Aprobación de negocio)
Científico de datos: Promover modelo a producción
(finish Modelo sustituido)

Científico de datos: (receive Alerta de deriva)
Científico de datos: Analizar causas de la deriva
Científico de datos: Reentrenar con datos recientes
Revisor: Comparar modelo nuevo con el actual en backtesting
¿El modelo nuevo es mejor?
No
Revisor: Documentar la deriva en el registro de incidencias
[db Registro de incidencias]
(finish Deriva documentada sin cambios)

Product owner: (receive Propuesta de sustitución)
Product owner: Revisar impacto en indicadores de negocio
(send Aprobación de negocio)

== pools ==
Plataforma de monitorización -> Detector de deriva
Equipo de ciencia de datos -> Científico de datos; Revisor
Negocio -> Product owner
