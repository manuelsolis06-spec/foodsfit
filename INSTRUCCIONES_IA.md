# FoodsFit - Documentación del Proyecto para IA

Este documento sirve como guía detallada para que una IA construya la aplicación web **FoodsFit**.

## Tecnologías Requeridas
*   **Frontend**: React (Vite o Next.js recomendado), HTML, CSS (o TailwindCSS si se prefiere).
*   **Backend/Base de Datos**: **Supabase** (Autenticación, Base de Datos PostgreSQL, Storage si es necesario). *(Nota: el usuario mencionó Firebase al principio pero luego especificó explícitamente Supabase como la base de datos).*

## Funcionalidades Principales

### 1. Autenticación de Usuarios (Supabase Auth)
*   **Registro e Inicio de Sesión**: Los usuarios deben poder crear una cuenta y acceder a ella.
*   **Privacidad de Datos**: Toda la información (comidas, peso, platos) debe ser estrictamente privada y estar vinculada al ID del usuario autenticado mediante las políticas de seguridad de nivel de fila (RLS) de Supabase. Nadie más debe poder ver los registros de un usuario.

### 2. Registro Diario de Comidas
*   **Interfaz de Registro**: Una pestaña o página donde el usuario vea su registro diario de comidas.
*   **Añadir Alimentos**: Un buscador o formulario para añadir alimentos. El usuario introducirá los gramos consumidos y el sistema calculará automáticamente las calorías (kcal) basadas en la información nutricional por 100g.
*   **Resumen Diario**: Mostrar el total de kcal consumidas en el día.

### 3. Seguimiento de Peso (Gráfica)
*   **Registro de Peso**: Una pestaña donde el usuario pueda registrar su peso actual en una fecha específica.
*   **Gráfica Evolutiva**: Mostrar una gráfica (por ejemplo, usando Chart.js o Recharts) que visualice el progreso del peso en el tiempo (ej. los últimos 3 meses). Cada punto en la gráfica representará un registro de peso, permitiendo ver fácilmente la tendencia de pérdida o ganancia.

### 4. Gestor de Platos/Recetas Personalizados
*   **Creación de Platos**: Una pestaña donde el usuario puede definir sus propias recetas (ej. "Fajita personal").
*   **Información Nutricional del Plato**: El usuario introducirá cuántas kcal tiene ese plato (ej. por cada 100g del plato preparado, o por unidad).
*   **Uso en el Registro Diario**: Estos platos personalizados deben aparecer como opciones disponibles cuando el usuario vaya a añadir una comida en su registro diario. Esto evita tener que añadir cada ingrediente de una receta frecuente de forma individual repetidas veces.

## Estructura de la Base de Datos (Supabase PostgreSQL)

Se sugiere la siguiente estructura de tablas:

1.  **`users`**: Gestionada por Supabase Auth.
2.  **`daily_logs`**:
    *   `id` (UUID)
    *   `user_id` (Relacionado con Auth)
    *   `date` (Fecha del registro)
    *   `food_name` (Nombre del alimento o plato)
    *   `grams` (Gramos consumidos)
    *   `total_kcal` (Calorías totales calculadas)
3.  **`weight_logs`**:
    *   `id` (UUID)
    *   `user_id` (Relacionado con Auth)
    *   `date` (Fecha)
    *   `weight` (Peso en kg)
4.  **`custom_meals`**:
    *   `id` (UUID)
    *   `user_id` (Relacionado con Auth)
    *   `name` (Nombre del plato, ej. "Fajita")
    *   `kcal_per_100g` (Calorías por 100g)

*(Es crucial aplicar RLS - Row Level Security en todas las tablas para que `user_id = auth.uid()`).*

## Pasos para la Implementación (Instrucciones para la IA)
1.  **Inicialización**: Crea el proyecto base usando Vite o Next.js.
2.  **Configuración de Supabase**: Instala el cliente de Supabase (`@supabase/supabase-js`) y configura las variables de entorno.
3.  **Base de Datos**: Genera el código SQL para crear las tablas mencionadas y sus políticas de RLS.
4.  **Desarrollo UI/UX**: Construye una interfaz moderna, limpia y responsive. Asegúrate de que las gráficas sean legibles.
5.  **Lógica de Estado**: Implementa la obtención y envío de datos a Supabase para las comidas diarias, el peso y los platos personalizados.
