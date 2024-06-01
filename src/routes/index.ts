import { RoutesInput } from '@/types/types'
import api from './api.route'
import projects from './projects.route'

export default ({ app }: RoutesInput) => {
    app.use('/upload/p', projects);
    app.use('/api/files/upload', api);
};