import express, { Router } from 'express';
import { authMiddleware } from '../../../shared/global/helpers/auth-middleware';
import { Get } from '../controllers/get-comments';
import { Add } from '../controllers/add-comment';

class CommentRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {

    // get all the comment for postId provided in queryParams
    this.router.get('/post/comments/:postId', authMiddleware.checkAuthentication, Get.prototype.comments);

    // Get all the name of the users who commented on the post for postId provided in queryParams
    this.router.get('/post/commentsnames/:postId', authMiddleware.checkAuthentication, Get.prototype.commentsNamesFromCache);

    // get the single commnet for the pos  that matches postId and commentId in the queryParams
    this.router.get('/post/single/comment/:postId/:commentId', authMiddleware.checkAuthentication, Get.prototype.singleComment);


    // create a new comment
    this.router.post('/post/comment', authMiddleware.checkAuthentication, Add.prototype.comment);

    return this.router;
  }
}

export const commentRoutes: CommentRoutes = new CommentRoutes();
