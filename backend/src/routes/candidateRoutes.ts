import { Router } from 'express';
import { addCandidate, getCandidateById, updateCandidateStageController } from '../presentation/controllers/candidateController';

const router = Router();

router.post('/', async (req, res) => {
  try {
    // console.log(req.body); //Just in case you want to inspect the request body
    const result = await addCandidate(req.body);
    res.status(201).send(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).send({ message: error.message });
    } else {
      res.status(500).send({ message: "An unexpected error occurred" });
    }
  }
});

router.get('/:id', getCandidateById);

/**
 * @swagger
 * /candidates/{id}/stage:
 *   put:
 *     summary: Actualiza la fase del candidato en el proceso de una posición
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: ID del candidato
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [positionId, currentInterviewStep]
 *             properties:
 *               positionId:
 *                 type: integer
 *                 minimum: 1
 *                 description: Posición cuyo proceso se actualiza
 *               currentInterviewStep:
 *                 type: integer
 *                 minimum: 1
 *                 description: ID del nuevo InterviewStep (debe pertenecer al flujo de la posición)
 *     responses:
 *       200:
 *         description: Etapa actualizada correctamente
 *       400:
 *         description: Datos inválidos o el step no pertenece al flujo de la posición
 *       404:
 *         description: Candidato o aplicación no encontrados
 */
router.put('/:id/stage', updateCandidateStageController);

export default router;
