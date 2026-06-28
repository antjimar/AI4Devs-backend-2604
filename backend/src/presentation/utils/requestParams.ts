/**
 * Parsea un parámetro de ruta como entero positivo.
 * Devuelve null si el valor no es un entero válido, para que el controlador
 * responda 400 de forma uniforme en todos los endpoints.
 */
export const parseId = (value: string): number | null => {
    const id = parseInt(value, 10);
    if (isNaN(id) || id <= 0 || String(id) !== value.trim()) {
        return null;
    }
    return id;
};
