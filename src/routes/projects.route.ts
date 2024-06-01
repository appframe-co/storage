import express, { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import {fromBuffer} from 'file-type';

const router = express.Router();

const renderImage = async (projectId:string, uuidFilename:string, width:number, height:number, ext:string) => {
    try {
        const image = sharp(`./upload/p/${projectId}/f/${uuidFilename}`);
        const {width: widthImg=0, height: heightImg=0} = await image.metadata();

        if (width || height) {
            width = !width ? widthImg : width;
            height = !height ? heightImg : height;

            image.resize({width, height, fit: sharp.fit.inside});
        }

        const buffer = ext !== 'webp' ? await image.toBuffer() : await image.webp().toBuffer();
        const mimeInfo = await fromBuffer(buffer);
        const bufferLength = buffer.length;

        return {buffer, bufferLength, mimeType: mimeInfo?.mime};
    } catch (e) {
        throw e;
    }
}

router.get('/:projectId/f/:filename', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const {projectId} = req.params;
        let filename = req.params.filename;

        let width = 0;
        let height = 0;

        const regex = new RegExp('_([0-9]{0,4})x([0-9]{0,4})(\\..*)$');
        filename = filename.replace(regex, (match, p1, p2, p3) => {
            width = p1 ? +p1 : 0;
            height = p2 ? +p2 : 0;

            return p3;
        });

        const arFilename = filename.split('.');
        const ext = arFilename.pop();
        if (!ext) {
            return next();
        }

        filename = arFilename.join('.');

        const resFetch = await fetch(`${process.env.URL_FILE_SERVICE}/api/files?projectId=${projectId}&filename=${filename}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data = await resFetch.json();
        const file = data.files[0];
        if (!file) {
            return next();
        }

        const uuidFilename = file.uuidName + '.' + file.ext;

        if (file.contentType === 'image') {
            const {buffer, bufferLength, mimeType} = await renderImage(projectId, uuidFilename, width, height, ext);

            res.writeHead(200, {
                'Content-Type': mimeType,
                'Content-Length': bufferLength
            });
            res.end(buffer);
        } else {
            res.sendStatus(200);
        }
    } catch (e) {
        next(e);
    }
});

export default router;