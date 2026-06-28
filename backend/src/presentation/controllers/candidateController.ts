import { Request, Response } from 'express';
import { addCandidate, findCandidateById } from '../../application/services/candidateService';
import { updateCandidateStage, StageUpdateError } from '../../application/services/applicationService';
import { parseId } from '../utils/requestParams';

export const addCandidateController = async (req: Request, res: Response) => {
    try {
        const candidateData = req.body;
        const candidate = await addCandidate(candidateData);
        res.status(201).json({ message: 'Candidate added successfully', data: candidate });
    } catch (error: unknown) {
        if (error instanceof Error) {
            res.status(400).json({ message: 'Error adding candidate', error: error.message });
        } else {
            res.status(400).json({ message: 'Error adding candidate', error: 'Unknown error' });
        }
    }
};

export const getCandidateById = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        const candidate = await findCandidateById(id);
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        res.json(candidate);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * PUT /candidates/:id/stage
 * Actualiza la fase del candidato en el proceso de una posición.
 * Body: { positionId: number, currentInterviewStep: number }
 */
export const updateCandidateStageController = async (req: Request, res: Response) => {
    try {
        const candidateId = parseId(req.params.id);
        if (candidateId === null) {
            return res.status(400).json({ error: 'Invalid candidate ID format' });
        }

        const { positionId, currentInterviewStep } = req.body;
        if (
            !Number.isInteger(positionId) ||
            positionId <= 0 ||
            !Number.isInteger(currentInterviewStep) ||
            currentInterviewStep <= 0
        ) {
            return res.status(400).json({
                error: 'positionId and currentInterviewStep are required and must be positive integers',
            });
        }

        const updated = await updateCandidateStage(candidateId, positionId, currentInterviewStep);
        return res.status(200).json({ message: 'Candidate stage updated successfully', data: updated });
    } catch (error) {
        if (error instanceof StageUpdateError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Error updating candidate stage:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export { addCandidate };