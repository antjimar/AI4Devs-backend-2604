import { Request, Response } from 'express';
import { getCandidatesByPosition } from '../../application/services/positionService';
import { DomainError } from '../../application/errors';
import { parseId } from '../utils/requestParams';

/**
 * GET /positions/:id/candidates
 * Devuelve los candidatos en proceso para una posición (vista Kanban).
 */
export const getCandidatesByPositionController = async (req: Request, res: Response) => {
    try {
        const positionId = parseId(req.params.id);
        if (positionId === null) {
            return res.status(400).json({ error: 'Invalid position ID format' });
        }

        const candidates = await getCandidatesByPosition(positionId);
        return res.status(200).json(candidates);
    } catch (error) {
        if (error instanceof DomainError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Error retrieving candidates for position:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
