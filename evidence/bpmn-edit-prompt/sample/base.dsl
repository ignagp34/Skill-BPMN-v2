Titular: (start Compra con tarjeta)
Titular: Introducir datos de pago
(send Solicitud de autorización)
(receive Alerta de posible fraude)
Titular: Confirmar o rechazar la compra en la app
(send Respuesta del titular)
(finish Respuesta enviada)

Analista de riesgos: (receive Solicitud de autorización)
[db Historial de transacciones]
service Consultar historial del cliente
(send Petición de puntuación)
(receive Puntuación de riesgo)
¿El riesgo es alto?
No
service Autorizar pago
(finish Pago autorizado)

Analista de riesgos: (receive Solicitud de autorización)
service Consultar historial del cliente
(send Petición de puntuación)
(receive Puntuación de riesgo)
¿El riesgo es alto?
Sí
Analista de riesgos: Bloquear temporalmente la tarjeta
(send Alerta de posible fraude)
(receive Respuesta del titular)
Analista de riesgos: Registrar decisión del titular
(finish Caso cerrado)

Analista de riesgos: Bloquear temporalmente la tarjeta
(send Alerta de posible fraude)
(timer 15 minutos)
Analista de riesgos: Cancelar la transacción
(finish Transacción cancelada)

Servicio de inferencia: (receive Petición de puntuación)
//Modelo de gradient boosting con 300 variables
service Calcular variables en tiempo real
service Puntuar transacción con el modelo
(send Puntuación de riesgo)

Equipo de MLOps: (timer cada noche)
Equipo de MLOps: Reentrenar modelo con fraudes confirmados
[Modelo de fraude actualizado]
Equipo de MLOps: Publicar nueva versión del modelo
(finish Modelo actualizado)

== pools ==
Cliente -> Titular
Banco -> Analista de riesgos
Proveedor de scoring IA -> Servicio de inferencia; Equipo de MLOps