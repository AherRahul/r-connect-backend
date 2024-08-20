import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from 'http-status-codes';
import { joiValidation } from '../../../shared/global/decorators/joi-validation.decoration';
import { addCommentSchema } from '../schemes/comment';
import { ICommentDocument, ICommentJob } from '../interfaces/comment.interface';
import { CommentCache } from '../../../shared/services/redis/comment.cache';
import { commentQueue } from '../../../shared/services/queues/comment.queue';

const commentCache: CommentCache = new CommentCache();

export class Add {


  // Add the comment on the post
  @joiValidation(addCommentSchema)
  public async comment(req: Request, res: Response): Promise<void> {

    // destructuring the body obj
    const { userTo, postId, profilePicture, comment } = req.body;

    // createing objectID to store the commnent into the cache against it
    const commentObjectId: ObjectId = new ObjectId();

    // structuring the commnet into proper format
    const commentData: ICommentDocument = {
      _id: commentObjectId,
      postId,
      username: `${req.currentUser?.username}`,
      avatarColor: `${req.currentUser?.avatarColor}`,
      profilePicture,
      comment,
      createdAt: new Date()
    } as ICommentDocument;

    // Save the comment into cache
    await commentCache.savePostCommentToCache(postId, JSON.stringify(commentData));

    // structuring the commnet Obj to store the commnet into DB
    const databaseCommentData: ICommentJob = {
      postId,
      userTo,
      userFrom: req.currentUser!.userId,
      username: req.currentUser!.username,
      comment: commentData
    };

    // adding commnet into queue to save ito to DB
    commentQueue.addCommentJob('addCommentToDB', databaseCommentData);

    // returning response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Comment created successfully' });
  }
}
