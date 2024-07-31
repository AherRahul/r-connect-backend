import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { IPostDocument } from '../../post/interfaces/post.interface';
import { PostCache } from '../../../shared/services/redis/post.cache';
import { postService } from '../../../shared/services/db/post.service';

const postCache: PostCache = new PostCache();

// default page size
const PAGE_SIZE = 10;

export class Get {

  // get the post
  public async posts(req: Request, res: Response): Promise<void> {
    // page number
    const { page } = req.params;

    // skiping the result => created for mongoDB
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    // limiting the result => created for mongoDB
    const limit: number = PAGE_SIZE * parseInt(page);

    // skiping the result => created for redis
    const newSkip: number = skip === 0 ? skip : skip + 1;

    let posts: IPostDocument[] = [];
    let totalPosts = 0;

    // feting the post from cache if redis has any
    const cachedPosts: IPostDocument[] = await postCache.getPostsFromCache('post', newSkip, limit);

    // if post found in cache
    if (cachedPosts.length) {
      posts = cachedPosts;

      // fetching the count of poast from cache
      totalPosts = await postCache.getTotalPostsInCache();
    } else {
      // fetching the posts from mongoDB
      posts = await postService.getPosts({}, skip, limit, { createdAt: -1 });

      // fetching the count from mongoDB
      totalPosts = await postService.postsCount();
    }

    // sending post back as response to client
    res.status(HTTP_STATUS.OK).json({ message: 'All posts', posts, totalPosts });
  }


  // get the post with images
  public async postsWithImages(req: Request, res: Response): Promise<void> {
    // page number
    const { page } = req.params;

    // skiping the result => created for mongoDB
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    // limiting the result => created for mongoDB
    const limit: number = PAGE_SIZE * parseInt(page);

    // skiping the result => created for redis
    const newSkip: number = skip === 0 ? skip : skip + 1;
    let posts: IPostDocument[] = [];

    // feting the post from cache if redis has any
    const cachedPosts: IPostDocument[] = await postCache.getPostsWithImagesFromCache('post', newSkip, limit);

    // if post found in cache else fetch from mongoDB
    posts = cachedPosts.length ? cachedPosts : await postService.getPosts({ imgId: '$ne', gifUrl: '$ne' }, skip, limit, { createdAt: -1 });

    // sending post back as response to client
    res.status(HTTP_STATUS.OK).json({ message: 'All posts with images', posts });
  }


  // get the post with videos
  public async postsWithVideos(req: Request, res: Response): Promise<void> {
    // page number
    const { page } = req.params;

    // skiping the result => created for mongoDB
    const skip: number = (parseInt(page) - 1) * PAGE_SIZE;
    // limiting the result => created for mongoDB
    const limit: number = PAGE_SIZE * parseInt(page);

    // skiping the result => created for redis
    const newSkip: number = skip === 0 ? skip : skip + 1;
    let posts: IPostDocument[] = [];

    // feting the post from cache if redis has any
    const cachedPosts: IPostDocument[] = await postCache.getPostsWithVideosFromCache('post', newSkip, limit);

    // if post found in cache else fetch from mongoDB
    posts = cachedPosts.length ? cachedPosts : await postService.getPosts({ videoId: '$ne' }, skip, limit, { createdAt: -1 });

    // sending post back as response to client
    res.status(HTTP_STATUS.OK).json({ message: 'All posts with videos', posts });
  }
}
