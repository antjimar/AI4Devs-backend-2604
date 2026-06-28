// Mock de Prisma. El factory se hoistea por encima del fichero, así que los
// objetos mock se crean DENTRO del factory (no pueden referenciar variables
// externas) y se recuperan en los tests a través de la instancia devuelta.
jest.mock('@prisma/client', () => {
    const position = { findUnique: jest.fn() };
    const application = { findMany: jest.fn() };
    return {
        PrismaClient: jest.fn(() => ({ position, application })),
    };
});

import { PrismaClient } from '@prisma/client';
import { getCandidatesByPosition, calculateAverageScore } from '../application/services/positionService';

// Tests de la función pura del cálculo de la media (sin tocar Prisma).
describe('calculateAverageScore', () => {
    it('devuelve la media de los scores presentes', () => {
        expect(calculateAverageScore([{ score: 4 }, { score: 5 }] as any)).toBe(4.5);
    });

    it('ignora los scores null/undefined', () => {
        expect(calculateAverageScore([{ score: 6 }, { score: null }, { score: 4 }] as any)).toBe(5);
    });

    it('devuelve null cuando no hay ningún score', () => {
        expect(calculateAverageScore([{ score: null }] as any)).toBeNull();
    });

    it('devuelve null con lista de entrevistas vacía', () => {
        expect(calculateAverageScore([])).toBeNull();
    });
});

// Instancia que usa el service (PrismaClient siempre devuelve el mismo objeto).
const prisma = new (PrismaClient as unknown as jest.Mock)();

describe('getCandidatesByPosition', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lanza "Position not found" si la posición no existe', async () => {
        prisma.position.findUnique.mockResolvedValue(null);

        await expect(getCandidatesByPosition(999)).rejects.toThrow('Position not found');
        expect(prisma.application.findMany).not.toHaveBeenCalled();
    });

    it('devuelve nombre completo, step actual y media de scores de la aplicación', async () => {
        prisma.position.findUnique.mockResolvedValue({ id: 1 });
        prisma.application.findMany.mockResolvedValue([
            {
                id: 10,
                candidateId: 42,
                candidate: { firstName: 'Jane', lastName: 'Doe' },
                interviewStep: { id: 3, name: 'Technical Interview' },
                interviews: [{ score: 4 }, { score: 5 }],
            },
        ]);

        const result = await getCandidatesByPosition(1);

        expect(result).toEqual([
            {
                candidateId: 42,
                applicationId: 10,
                fullName: 'Jane Doe',
                currentInterviewStep: { id: 3, name: 'Technical Interview' },
                averageScore: 4.5,
            },
        ]);
    });

    it('ignora los scores nulos al calcular la media', async () => {
        prisma.position.findUnique.mockResolvedValue({ id: 1 });
        prisma.application.findMany.mockResolvedValue([
            {
                id: 11,
                candidateId: 7,
                candidate: { firstName: 'John', lastName: 'Smith' },
                interviewStep: { id: 2, name: 'HR Interview' },
                interviews: [{ score: 6 }, { score: null }, { score: 4 }],
            },
        ]);

        const result = await getCandidatesByPosition(1);

        expect(result[0].averageScore).toBe(5); // (6 + 4) / 2
    });

    it('devuelve averageScore null cuando no hay scores', async () => {
        prisma.position.findUnique.mockResolvedValue({ id: 1 });
        prisma.application.findMany.mockResolvedValue([
            {
                id: 12,
                candidateId: 8,
                candidate: { firstName: 'Ada', lastName: 'Lovelace' },
                interviewStep: { id: 1, name: 'Application Review' },
                interviews: [{ score: null }],
            },
        ]);

        const result = await getCandidatesByPosition(1);

        expect(result[0].averageScore).toBeNull();
    });

    it('devuelve lista vacía si la posición no tiene aplicaciones', async () => {
        prisma.position.findUnique.mockResolvedValue({ id: 1 });
        prisma.application.findMany.mockResolvedValue([]);

        const result = await getCandidatesByPosition(1);

        expect(result).toEqual([]);
    });
});
