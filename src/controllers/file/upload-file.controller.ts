import Jimp from "jimp";

export default function CreateFileController({userId, projectId, files}: {userId: string, projectId: string, files: any}): void
    {
    try {
        for (const file of files) {
            Jimp.read(file.originalSource).then((image) => {
                let width = image.getWidth();
                let height = image.getHeight();

                if (height > 5760 || width > 5760) {
                    image.scaleToFit(5760, 5760);

                    width = image.getWidth();
                    height = image.getHeight();
                }

                const arUrl = file.originalSource.split('/');
                const uuidName = arUrl[arUrl.length-2];

                image.quality(80).write(`./upload/p/${projectId}/f/${uuidName}.${file.ext}`);

                fetch(`${process.env.URL_FILE_SERVICE}/api/files/${file.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({userId, projectId, id: file.id, state: 'fulfilled', width, height})
                });
              })
              .catch((err) => {
                fetch(`${process.env.URL_FILE_SERVICE}/api/files/${file.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({userId, projectId, id: file.id, state: 'rejected'})
                });
              });
        }
    } catch (error) {
        throw error;
    }
}