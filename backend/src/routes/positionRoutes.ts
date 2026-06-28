import { Router } from 'express';
import { getCandidatesByPositionController } from '../presentation/controllers/positionController';

const router = Router();

/**
 * @swagger
 * /positions/{id}/candidates:
 *   get:
 *     summary: Lista los candidatos en proceso para una posición (vista Kanban)
 *     tags: [Positions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID de la posición
 *     responses:
 *       200:
 *         description: Lista de candidatos en proceso
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   candidateId:
 *                     type: integer
 *                   applicationId:
 *                     type: integer
 *                   fullName:
 *                     type: string
 *                   currentInterviewStep:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                   averageScore:
 *                     type: number
 *                     nullable: true
 *       400:
 *         description: ID de posición inválido
 *       404:
 *         description: Posición no encontrada
 */
router.get('/:id/candidates', getCandidatesByPositionController);

export default router;
