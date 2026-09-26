# Aviso de terceros: `auto-layout.js`

`auto-layout.js` es una copia modificada de `dist/index.js` de **bpmn-auto-layout 0.5.0** (licencia MIT, © bpmn.io / Camunda Services GmbH), el mismo paquete que ya figura en `THIRD-PARTY-NOTICES.md` de la raíz. Se usa solo en el candidato de layout v12 del laboratorio; el motor y el resto de layouts usan el paquete de npm sin cambios.

Cambios, marcados «layout v12» en el código:

- `Grid.addAfter` coloca el nodo en la celda siguiente si está libre y, si no, abre una columna en todas las filas, en lugar de insertarlo en la fila y empujar el resto;
- `createGridLayout` arranca desde el primer nodo en orden de documento cuando el proceso no tiene nodo sin entrada, y da una fila nueva a cada nodo que quede sin alcanzar;
- las funciones de `min-dash` que usaba (`assign`, `map`, `pick`, `isFunction`) están escritas en el propio archivo.

`THIRD-PARTY-NOTICES.md` pertenece a la instantánea congelada del repositorio original (`smoke/verify-source.mjs`) y no se modifica; este aviso lo complementa.
