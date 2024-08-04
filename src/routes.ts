import { authRoutes } from './features/auth/routes/authRoutes';
import { Application } from 'express';
import { serverAdapter } from './shared/services/queues/base.queue';
import { currentUserRoutes } from './features/auth/routes/currentRoutes';
import { authMiddleware } from './shared/global/helpers/auth-middleware';
import { postRoutes } from './features/post/routes/postRoutes';
import { reactionRoutes } from './features/reactions/routes/reactionRoutes';
import { commentRoutes } from './features/comments/routes/commentRoutes';
import { followerRoutes } from './features/followers/routes/followerRoutes';

const BASE_PATH = '/api/v1';

export default (app: Application) => {
  const routes = () => {
    // this is for GUI, to undarstand if there is any job fail
    app.use('/queues', serverAdapter.getRouter());

    // configuration for signout route
    app.use(BASE_PATH, authRoutes.signoutRoute());

    // authRoutes
    app.use(BASE_PATH, authRoutes.routes());

    // currentuser routes
    app.use(BASE_PATH, authMiddleware.verifyUser, currentUserRoutes.routes());
    // post routes
    app.use(BASE_PATH, authMiddleware.verifyUser, postRoutes.routes());
    // reactions routes
    app.use(BASE_PATH, authMiddleware.verifyUser, reactionRoutes.routes());
    // comments routes
    app.use(BASE_PATH, authMiddleware.verifyUser, commentRoutes.routes());
    // followers routes
    app.use(BASE_PATH, authMiddleware.verifyUser, followerRoutes.routes());


  };

  routes();
};
