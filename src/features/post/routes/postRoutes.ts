import express, { Router } from 'express';
import { authMiddleware } from '../../../shared/global/helpers/auth-middleware';
import { Create } from '../controllers/create-post';
import { Get } from '../controllers/get-posts';
import { Delete } from '../controllers/delete-post';
import { Update } from '../controllers/update-post';

class PostRoutes {
  private router: Router;

  constructor() {
    this.router = express.Router();
  }

  public routes(): Router {
    // get the post
    this.router.get('/post/all/:page', authMiddleware.checkAuthentication, Get.prototype.posts);
    // get the post with images
    this.router.get('/post/images/:page', authMiddleware.checkAuthentication, Get.prototype.postsWithImages);
    // get the post with videos
    this.router.get('/post/videos/:page', authMiddleware.checkAuthentication, Get.prototype.postsWithVideos);

    // create post
    this.router.post('/post', authMiddleware.checkAuthentication, Create.prototype.post);
    // create post with image
    this.router.post('/post/image/post', authMiddleware.checkAuthentication, Create.prototype.postWithImage);
    // create post with video
    this.router.post('/post/video/post', authMiddleware.checkAuthentication, Create.prototype.postWithVideo);

    // updating post
    // updating the post
    this.router.put('/post/:postId', authMiddleware.checkAuthentication, Update.prototype.posts);
    // updating the post images
    this.router.put('/post/image/:postId', authMiddleware.checkAuthentication, Update.prototype.postWithImage);
    // updating the post videos
    this.router.put('/post/video/:postId', authMiddleware.checkAuthentication, Update.prototype.postWithVideo);


    // Delete post by postId
    this.router.delete('/post/:postId', authMiddleware.checkAuthentication, Delete.prototype.post);

    return this.router;
  }
}

export const postRoutes: PostRoutes = new PostRoutes();
