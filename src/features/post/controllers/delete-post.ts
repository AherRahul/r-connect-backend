import { Request, Response } from 'express';
import { PostCache } from '../../../shared/services/redis/post.cache';
import HTTP_STATUS from 'http-status-codes';
import { postQueue } from '../../../shared/services/queues/post.queue';
import { socketIOPostObject } from '../../../shared/scokets/post';

const postCache: PostCache = new PostCache();

export class Delete {
  public async post(req: Request, res: Response): Promise<void> {

    // emmting the event saying post is deleted
    socketIOPostObject.emit('delete post', req.params.postId);

    // delete the post from cache
    await postCache.deletePostFromCache(req.params.postId, `${req.currentUser!.userId}`);

    // deleting post from db
    postQueue.addPostJob('deletePostFromDB', { keyOne: req.params.postId, keyTwo: req.currentUser!.userId });

    // Sending msg back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Post deleted successfully' });
  }
}
