import { PrismaClient, Prisma } from '@prisma/client';
import { DomainError } from '../errors';

const prisma = new PrismaClient();

// Aplicación con las relaciones que necesita la vista Kanban. Tipar el payload
// de forma explícita evita depender de la inferencia del cliente generado
// (que, si no está regenerado, hace que el editor marque los callbacks como 'any').
type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
    include: { candidate: true; interviewStep: true; interviews: true };
}>;

// Tipo de cada entrevista, derivado del propio payload (sin importar tipos extra).
type ApplicationInterview = ApplicationWithRelations['interviews'][number];

/**
 * Calcula la puntuación media de un conjunto de entrevistas, ignorando las que
 * no tienen score (null/undefined). Devuelve null si ninguna tiene puntuación.
 *
 * Función pura: es la regla de negocio del cálculo aislada de Prisma, así se
 * testea directamente sin mockear la base de datos.
 */
export const calculateAverageScore = (interviews: ApplicationInterview[]): number | null => {
    const scores = interviews
        .map((interview) => interview.score)
        .filter((score): score is number => score !== null && score !== undefined);

    if (scores.length === 0) {
        return null;
    }
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

/**
 * Representa a un candidato dentro del pipeline de una posición (vista Kanban).
 */
export interface CandidateInProcess {
    candidateId: number;
    applicationId: number;
    fullName: string;
    currentInterviewStep: {
        id: number;
        name: string;
    };
    averageScore: number | null;
}

/**
 * Recupera todos los candidatos en proceso para una posición concreta.
 *
 * Para cada aplicación de la posición devuelve el nombre completo del
 * candidato, la fase actual del proceso (current_interview_step) y la
 * puntuación media de las entrevistas de ESA aplicación (ignorando los
 * scores nulos). Si no hay entrevistas con score, averageScore es null.
 *
 * @throws {DomainError} 404 si la posición no existe.
 */
export const getCandidatesByPosition = async (positionId: number): Promise<CandidateInProcess[]> => {
    const position = await prisma.position.findUnique({ where: { id: positionId } });
    if (!position) {
        throw new DomainError('Position not found', 404);
    }

    const applications = await prisma.application.findMany({
        where: { positionId },
        include: {
            candidate: true,
            interviewStep: true,
            interviews: true,
        },
    });

    return applications.map((application: ApplicationWithRelations) => ({
        candidateId: application.candidateId,
        applicationId: application.id,
        fullName: `${application.candidate.firstName} ${application.candidate.lastName}`,
        currentInterviewStep: {
            id: application.interviewStep.id,
            name: application.interviewStep.name,
        },
        averageScore: calculateAverageScore(application.interviews),
    }));
};
