# Bitácora

Registro de las fuentes usadas para las bases de datos de ProscOut y de las fórmulas que calculan la alimentación.

## Frases estoicas

La frase del día es estable: el día del año, módulo el número de frases, elige siempre la misma hasta el día siguiente.

Fuente descargada el 25 de septiembre de 2026: [Wikiquote en español](https://es.wikiquote.org/) (licencia CC BY-SA), páginas de Marco Aurelio, Epicteto, Séneca, Zenón de Citio y Estoicismo.

Solo se guardan citas en español de como mucho 200 caracteres, para que quepan en unas cuatro líneas. El resultado está en `prisma/data/quotes.json`.

## Alimentos

La búsqueda de alimentos lee la tabla local `Food`. No consulta internet en el momento de buscar.

Fuente: **AESAN/BEDCA Base de Datos Española de Composición de Alimentos v1.0 (2010)**. Uso personal, educativo o no comercial, sin modificar el significado de los datos. Copia descargada el 25 de septiembre de 2026 desde [TerjeRu/bedca-database](https://github.com/TerjeRu/bedca-database) (`output/bedca_foods.csv`, guardado en `prisma/data/bedca_foods.csv`).

- Nombres en español (`f_ori_name`).
- Por 100 g: proteína (`PROT`, g), hidratos (`CHO`, g) y grasa (`FAT`, g).
- La energía de BEDCA viene casi siempre en kJ (`ENERC`). Se pasa a kcal dividiendo entre 4,184. Si la unidad ya era kcal, se deja tal cual.

El resultado que carga la aplicación está en `prisma/data/foods.json`. El script `scripts/seed.mjs` vuelca ambas tablas a SQLite.

## Fórmulas de alimentación

- **TMB** (metabolismo basal): ecuación de Mifflin-St Jeor (1990).
  - Hombre: `10 × kg + 6,25 × cm − 5 × edad + 5`
  - Mujer: `10 × kg + 6,25 × cm − 5 × edad − 161`
  - El sexo entra en la fórmula; por eso el formulario lo pide aunque no estuviera en la lista inicial de campos.
- **Mantenimiento**: TMB × factor de actividad habitual (1,2 sedentario, 1,375 ligero, 1,55 moderado, 1,725 intenso).
- **Objetivo**: mantenimiento × `(1 − porcentaje / 100)`. El porcentaje de reducción se elige entre 0 y 50.

## Plan de alimentación

El plan reparte el objetivo del día en cuatro tomas: desayuno 25 %, comida 35 %, merienda 15 % y cena 25 %. Sale de la base local de alimentos. El mismo perfil produce siempre el mismo plan.

1. Calorías del día: el objetivo ya calculado (TMB de Mifflin-St Jeor, por el factor de actividad, menos el porcentaje de reducción).
2. Proteína: 1,6 g por kilo de peso. Grasa: 0,8 g por kilo. El resto de calorías, hasta el objetivo, son hidratos (4 kcal por gramo de proteína o hidrato, 9 por gramo de grasa). Si proteína y grasa juntas pasan del objetivo, se baja primero la grasa y, si aún no cabe, la proteína.
3. Cada toma recibe su porcentaje de esas calorías.
4. Los alimentos salen de grupos fijos. El nombre tiene que empezar por la palabra del grupo (así «arroz» no coge un cereal que solo lo menciona). Si hay uno frito, azucarado, con miel, chocolate, mousse o bollería y otro más simple, se queda el simple:
   - Desayuno: avena, pan, huevo, leche, yogur, manzana.
   - Comida: pollo, arroz, lenteja, patata, tomate, merluza.
   - Merienda: yogur, manzana, nuez, almendra, queso.
   - Cena: merluza, atún, huevo, tomate, patata, pavo.
   Se descartan los que tienen menos de 30 o más de 450 kcal por 100 g. Un alimento no se repite en el día, y dentro de una toma tampoco se repite el mismo tipo (por ejemplo, dos yogures o dos pollos).
5. En cada toma se eligen como mucho tres alimentos. La ración se prueba en 50, 80, 100, 120, 150 y 200 g y se queda la que más se acerca a las calorías que faltan repartidas entre los huecos que quedan, sin pasar del 108 % de lo que falta. Se para si faltan menos de 60 kcal o ya hay tres alimentos.

El texto del plan se puede guardar como un plan con nombre en Plan de alimentación. Ahí se editan los gramos y las columnas (kcal, proteína, hidratos y grasa) se recalculan con los valores por 100 g. Se pueden guardar varios. Si cambias el peso y guardas el perfil, se crea un plan nuevo con ese peso, pasa a ser el activo y el anterior se conserva. En Alimentación se indica si ese plan queda por debajo o por encima del objetivo, y por cuántas kcal.

En semana, mes y año el porcentaje solo cuenta los días ya llegados. Una actividad puede limitarse con desde y hasta; si no se marcan, cuenta todo el periodo.

## Uso en la aplicación

- En el mes, elegir un día abre la pantalla de ese día, igual que en el año.
- Hoy, semana, mes y año filtran por etiqueta. Al crear una etiqueta se guarda al momento y queda disponible en esos filtros.
- En un día concreto se pueden quitar las tareas que ya salían ahí. Si la tarea era solo de esa fecha, se borra; si se repetía, deja de salir ese día y sigue en los demás.
- Crear tarea en el día está plegada en un botón. Si no se marcan horarios ni fechas, la tarea queda únicamente en esa fecha.
- En el plan, desayuno, comida, merienda y cena son botones. Añadir un alimento lo mete en la toma que esté marcada.
- Los gramos, las kcal, la proteína, los hidratos y la grasa de una línea se pueden cambiar. Ese cambio se guarda solo en esa línea del plan. La tabla de alimentos no se modifica.
- Cada línea tiene un icono de nota. El texto es de ese alimento dentro del plan.
- Si cambias proteína, hidratos o grasa de una línea, las kcal de esa línea pasan a ser `4 × proteína + 4 × hidratos + 9 × grasa`. Cambiar los gramos escala esas cantidades y, con ellas, las kcal.
- En Alimentación el plan activo se lee en columnas, sin editar, con la suma de cada toma y el total al final.
- Abajo a la derecha hay un interruptor de tema claro u oscuro. La posición se anima y se guarda en el navegador.
- Una tarea creada para un solo día se ve en ese día y en la semana que lo contiene, solo en esa fecha. No aparece en el mes ni en el año.
- En `Food`, `unitGrams` vacío significa que el alimento no es contable. Si tiene valor, son los gramos de una unidad. Un huevo entero cuenta como 50 g, así que 150 g son 3. No cuentan la clara ni la yema solas. También manzana (180 g), plátano (120 g), naranja (150 g), kiwi (75 g) y pera (160 g). Delante del nombre se escribe esa cantidad, por ejemplo `3 · Huevo…`. La tabla de nutrientes no cambia.
- Los productos de Mercadona, Carrefour, Lidl, Alcampo, Dia y Masymas salen de [Open Food Facts](https://openfoodfacts.org) (licencia ODbL), no de las webs de cada cadena: el código de barras no está publicado ahí. `scripts/mercados.py` guarda el código, la etiqueta de tipo (jugo, carnes, cereal…) y la del mercado en `Food`, y deja la misma copia en `mercados.sql`. El plan automático sigue usando solo los alimentos de BEDCA. En Alimentación, «Añadir alimento a la BBDD» abre la cámara: si el código no está, lo busca y lo guarda.

## Mercados

Descargado el 25 de septiembre de 2026 con `scripts/mercados.py`. Son 27.242 productos con código de barras, además de los 955 de BEDCA, que no llevan código. La misma lista está en la tabla `Food` y, separada, en `mercados.sql` (tabla `MarketFood`) en la raíz del proyecto. También queda una copia en `prisma/data/mercados.json`.

Cada producto tiene el código de barras, kcal, proteína, hidratos y grasa por 100 g, una etiqueta de tipo (jugo, carnes, cereal, lácteos, pescado, verduras, frutas, bebidas, snacks y otras) y otra del mercado: mercadona, carrefour, lidl, alcampo, dia o masymas. Si se vende en varios, van juntos.

El buscador público de Open Food Facts corta en 10.000 resultados por consulta. Carrefour y Lidl llegan a ese tope, así que no es el catálogo entero de cada tienda. Mercadona salió completo dentro de ese índice (5.365), Alcampo 1.007, Dia 2.078 y Masymas 32, antes de quitar repetidos.

En el plan, al cargar un alimento se ven debajo sus etiquetas, incluida la del mercado. El desplegable de mercado deja buscar solo en uno. Un ejemplo que sí está: «Zumo de guayaba sin azucares» (código 8480000396594, Mercadona, jugo) y «Nectar guayaba» (8480000392800, Mercadona). BEDCA tiene la guayaba como fruta, no como zumo.

Cada producto de supermercado guarda también el peso o volumen del envase (`packageSize`, por ejemplo 200 g o 1 L), la foto (`imageUrl`, miniatura de Open Food Facts) y el precio en euros (`price`) cuando [Open Prices](https://prices.openfoodfacts.org) lo tiene en España o en esa cadena. En la primera carga había foto en 25.856, peso de envase en 21.819 y precio en 593, porque Open Prices casi no tiene estas cadenas. `scripts/precios.py` completa el precio leyendo la ficha pública de Mercadona, donde cada producto trae el EAN y el precio de venta, y lo guarda en `Food` cuando el código de barras coincide. Carrefour, Dia, Lidl, Alcampo y Masymas no están dejando leer el catálogo con el código (responden 403, 404 o una página sin EAN), así que de esas cadenas no se copia un precio inventado. La foto, el peso y el precio se ven al buscar el alimento, en la línea del plan y en la tabla de Alimentación.

## Alimentos generales

Orientativos para otros países, sin precio y sin código de barras. Los carga `scripts/alimentos-general.py`. La nutrición por 100 g sale de una búsqueda en [Open Food Facts](https://world.openfoodfacts.org/). La foto es una miniatura de [Wikimedia Commons](https://commons.wikimedia.org/). Cada alimento lleva sus etiquetas y, además, `general`. Por ejemplo, pechuga de pollo: `pollo, carne, general`, sin precio. No sustituyen a los de BEDCA ni a los de supermercado: se insertan aparte. La copia separada está en `alimentos_general.sql`. El plan automático no los usa. En la búsqueda se pueden marcar una o varias etiquetas a la vez: el alimento tiene que tenerlas todas.