import express, { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import {fromBuffer} from 'file-type';
import { TErrorResponse, TPlan, TProject } from '@/types/types';

const router = express.Router();

function isErrorProject(data: TErrorResponse|{project: TProject}): data is TErrorResponse {
    return !!(data as TErrorResponse).error;
}
function isErrorPlans(data: TErrorResponse|{plans: TPlan[]}): data is TErrorResponse {
    return !!(data as TErrorResponse).error;
}

const checkPlan = async (projectId:string) => {
    try {
        const resFetch = await fetch(`${process.env.URL_PROJECT_SERVICE}/api/projects/${projectId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const data: TErrorResponse|{project:TProject} = await resFetch.json();
        if (isErrorProject(data)) {
            throw new Error('Invalid project');
        }

        const {trialFinishedAt, planFinishedAt} = data.project;

        const trialFinishedAtTimestamp = new Date(trialFinishedAt).getTime();
        const planFinishedAtTimestamp = new Date(planFinishedAt).getTime();

        const now = Date.now();
        if (now > trialFinishedAtTimestamp) {
            if (now > planFinishedAtTimestamp) {
                throw new Error('plan expired');
            }
        }

        const resFetchPlans = await fetch(`${process.env.URL_PROJECT_SERVICE}/api/plans?code=${data.project.plan}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const dataPlans: TErrorResponse|{plans:TPlan[]} = await resFetchPlans.json();
        if (isErrorPlans(dataPlans)) {
            throw new Error('Invalid plans');
        }

        const {features} = dataPlans.plans[0];
        const featureFile = features.find(f => f.code === 'files');
        if (!featureFile) {
            throw new Error('error feature plan');
        }

        return {
            webpEnabled: featureFile.rules.webp,
            dynamicResizeEnabled: featureFile.rules.dynamicResize
        };
    } catch(e) {
        return {
            webpEnabled: false,
            dynamicResizeEnabled: false
        };
    }
};

const renderImage = async (projectId:string, uuidName:string, filename:string, width:number, height:number, ext:string, key:string) => {
    try {
        const res = await fetch(`${process.env.S3_URL}/p/${projectId}/f/${uuidName}/${filename}.${ext}`);
        const fileBuf = await res.arrayBuffer();

        const image = sharp(fileBuf);
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
        const isDynamicResize = regex.test(filename);

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

        if (file.contentType === 'image') {
            if (isDynamicResize || ext === 'webp') {
                const {webpEnabled, dynamicResizeEnabled} = await checkPlan(projectId);

                if (isDynamicResize && !dynamicResizeEnabled) {
                    return res.status(404).send('Dynamic resize image does not enabled. Please, upgrade your plan.');
                }
                if (ext === 'webp' && !webpEnabled) {
                    return res.status(404).send('Webp format does not enabled. Please, upgrade your plan.');
                }
            }

            const {buffer, bufferLength, mimeType} = await renderImage(projectId, file.uuidName, filename, width, height, ext, file.S3Key);

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