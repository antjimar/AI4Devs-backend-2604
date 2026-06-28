import { PrismaClient } from '@prisma/client';
import { DomainError } from '../errors';

const prisma = new PrismaClient();

/**
 * Error de la actualización de etapa. Es un DomainError (lleva statusCode), lo
 * que permite al controlador mapearlo a 400/404 sin comparar el texto.
 */
export class StageUpdateError extends DomainError {}

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

        // En el dominio un candidato tiene una sola aplicación por posición, pero
        // el schema base no lo fuerza con un @@unique. Ordenamos por id para que el
        // lookup sea determinista (siempre la misma fila) y nunca actúe sobre una
        // aplicación arbitraria si hubiera datos duplicados.
        const application = await tx.application.findFirst({
            where: { candidateId, positionId },
            orderBy: { id: 'asc' },
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
