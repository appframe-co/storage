import express, { Request, Response, NextFunction } from 'express';

import UploadFileController from '@/controllers/file/upload-file.controller'

const router = express.Router();

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        let { userId, projectId, files } = req.body;

        UploadFileController({
            userId,
            projectId,
            files
        });

        res.json({files: []});
    } catch (e) {
        let message = String(e);

        if (e instanceof Error) {
            message = e.message; 
        }

        res.json({error: 'server_error', description: message});
    }
});

export default router;