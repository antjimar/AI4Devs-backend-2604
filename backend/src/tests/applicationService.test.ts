jest.mock('@prisma/client', () => {
    const candidate = { findUnique: jest.fn() };
    const position = { findUnique: jest.fn() };
    const application = { findFirst: jest.fn(), update: jest.fn() };
    const interviewStep = { findFirst: jest.fn() };
    const client: any = { candidate, position, application, interviewStep };
    // $transaction recibe un callback y le pasa el cliente como `tx`
    // (igual que Prisma con transacciones interactivas).
    client.$transaction = jest.fn((fn: (tx: unknown) => unknown) => fn(client));
    return { PrismaClient: jest.fn(() => client) };
});

import { PrismaClient } from '@prisma/client';
import { updateCandidateStage, StageUpdateError } from '../application/services/applicationService';

const prisma = new (PrismaClient as unknown as jest.Mock)();

describe('updateCandidateStage', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lanza 404 si el candidato no existe', async () => {
        prisma.candidate.findUnique.mockResolvedValue(null);

        await expect(updateCandidateStage(999, 1, 3)).rejects.toBeInstanceOf(StageUpdateError);
        await expect(updateCandidateStage(999, 1, 3)).rejects.toMatchObject({
            statusCode: 404,
            message: 'Candidate not found',
        });
        expect(prisma.application.update).not.toHaveBeenCalled();
    });

    it('lanza 404 si no hay aplicación para ese candidato y posición', async () => {
        prisma.candidate.findUnique.mockResolvedValue({ id: 42 });
        prisma.application.findFirst.mockResolvedValue(null);

        await expect(updateCandidateStage(42, 1, 3)).rejects.toMatchObject({ statusCode: 404 });
        expect(prisma.application.update).not.toHaveBeenCalled();
    });

    it('lanza 400 si el step no pertenece al flujo de la posición', async () => {
        prisma.candidate.findUnique.mockResolvedValue({ id: 42 });
        prisma.application.findFirst.mockResolvedValue({ id: 10, candidateId: 42, positionId: 1 });
        prisma.position.findUnique.mockResolvedValue({ id: 1, interviewFlowId: 5 });
        prisma.interviewStep.findFirst.mockResolvedValue(null); // step no encontrado en ese flujo

        await expect(updateCandidateStage(42, 1, 99)).rejects.toMatchObject({ statusCode: 400 });
        expect(prisma.application.update).not.toHaveBeenCalled();
    });

    it('actualiza el step y devuelve el step destino {id, name} cuando todo es válido', async () => {
        prisma.candidate.findUnique.mockResolvedValue({ id: 42 });
        prisma.application.findFirst.mockResolvedValue({ id: 10, candidateId: 42, positionId: 1 });
        prisma.position.findUnique.mockResolvedValue({ id: 1, interviewFlowId: 5 });
        prisma.interviewStep.findFirst.mockResolvedValue({ id: 3, interviewFlowId: 5, name: 'Manager Interview' });
        prisma.application.update.mockResolvedValue({ id: 10, currentInterviewStep: 3 });

        const result = await updateCandidateStage(42, 1, 3);

        expect(prisma.$transaction).toHaveBeenCalled();
        expect(prisma.application.update).toHaveBeenCalledWith({
            where: { id: 10 },
            data: { currentInterviewStep: 3 },
        });
        expect(result).toEqual({
            id: 10,
            currentInterviewStep: { id: 3, name: 'Manager Interview' },
        });
    });
});
