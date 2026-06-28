import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Error de dominio para distinguir, en el controlador, entre un fallo de
 * validación/regla de negocio (400) y un recurso inexistente (404).
 */
export class StageUpdateError extends Error {
    constructor(message: string, public readonly statusCode: 400 | 404) {
        super(message);
        this.name = 'StageUpdateError';
        // Con target es5, extender Error rompe la cadena de prototipos y
        // `instanceof` deja de funcionar; restaurarla manualmente lo arregla.
        Object.setPrototypeOf(this, StageUpdateError.prototype);
    }
}

/**
 * Actualiza la fase actual (currentInterviewStep) de un candidato en el
 * proceso de una posición concreta.
 *
 * El candidato puede tener varias aplicaciones, por eso se identifica la
 * aplicación exacta con candidateId + positionId. El nuevo step debe
 * pertenecer al flujo de entrevistas de esa posición.
 *
 * @throws {StageUpdateError} 404 si el candidato o la aplicación no existen;
 *                            400 si el step no pertenece al flujo de la posición.
 */
export const updateCandidateStage = async (
    candidateId: number,
    positionId: number,
    newInterviewStepId: number,
) => {
    // Validaciones y escritura en una única transacción: garantiza que el estado
    // que se valida es el mismo que se actualiza (Unit of Work), evitando
    // condiciones de carrera entre la lectura y el update.
    return prisma.$transaction(async (tx) => {
        const candidate = await tx.candidate.findUnique({ where: { id: candidateId } });
        if (!candidate) {
            throw new StageUpdateError('Candidate not found', 404);
        }

        const application = await tx.application.findFirst({
            where: { candidateId, positionId },
        });
        if (!application) {
            throw new StageUpdateError('Application not found for this candidate and position', 404);
        }

        const position = await tx.position.findUnique({ where: { id: positionId } });
        if (!position) {
            throw new StageUpdateError('Position not found', 404);
        }

        // El nuevo step debe existir y pertenecer al flujo de entrevistas de la posición.
        const interviewStep = await tx.interviewStep.findFirst({
            where: { id: newInterviewStepId, interviewFlowId: position.interviewFlowId },
        });
        if (!interviewStep) {
            throw new StageUpdateError(
                'The interview step does not belong to the position interview flow',
                400,
            );
        }

        const updated = await tx.application.update({
            where: { id: application.id },
            data: { currentInterviewStep: newInterviewStepId },
        });

        // Se devuelve también el step destino {id, name} para que el cliente
        // (Kanban) pueda confirmar la nueva columna sin una llamada extra.
        return {
            ...updated,
            currentInterviewStep: { id: interviewStep.id, name: interviewStep.name },
        };
    });
};
