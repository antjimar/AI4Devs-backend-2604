/**
 * Error de dominio con código HTTP asociado. Permite que los servicios señalen
 * el tipo de fallo (recurso inexistente, regla de negocio…) y que el controlador
 * lo traduzca a un status code sin acoplarse al texto del mensaje.
 */
export class DomainError extends Error {
    constructor(message: string, public readonly statusCode: 400 | 404) {
        super(message);
        this.name = 'DomainError';
        // Con target es5, extender Error rompe la cadena de prototipos y
        // `instanceof` deja de funcionar; restaurarla manualmente lo arregla.
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
