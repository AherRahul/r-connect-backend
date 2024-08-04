import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { ICommentDocument, ICommentNameList } from '../interfaces/comment.interface';
import { CommentCache } from '../../../shared/services/redis/comment.cache';
import { commentService } from '../../../shared/services/db/comment.service';
import mongoose from 'mongoose';

const commentCache: CommentCache = new CommentCache();

export class Get {

  // get all the commnets for a particular post provide in queryParams
  public async comments(req: Request, res: Response): Promise<void> {

    // getting postID from queryParams
    const { postId } = req.params;

    // getiing all the comment from cache and returning it in the form of ICommentDocument
    const cachedComments: ICommentDocument[] = await commentCache.getCommentsFromCache(postId);

    // if comments are not present into cache then fteching it from DB
    const comments: ICommentDocument[] = cachedComments.length
      ? cachedComments
      : await commentService.getPostComments({ postId: new mongoose.Types.ObjectId(postId) }, { createdAt: -1 });


    // returning the response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Post comments', comments });
  }


  // get the list of userNames whos are commneted on the post passed as queryParams
  public async commentsNamesFromCache(req: Request, res: Response): Promise<void> {

    // getting postID from queryParams
    const { postId } = req.params;

    // getiing userNames of the comment from cache and returning it in the form of ICommentNameList
    const cachedCommentsNames: ICommentNameList[] = await commentCache.getCommentsNamesFromCache(postId);

    // if userNames of the comments are not present into cache then fteching it from DB
    const commentsNames: ICommentNameList[] = cachedCommentsNames.length
      ? cachedCommentsNames
      : await commentService.getPostCommentNames({ postId: new mongoose.Types.ObjectId(postId) }, { createdAt: -1 });


    // returning the response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Post comments names', comments: commentsNames.length ? commentsNames[0] : [] });
  }



  // get the single comment matching to postID and commentID
  public async singleComment(req: Request, res: Response): Promise<void> {

    // getting postID and commentId from queryParams
    const { postId, commentId } = req.params;

    // getiing the comment from cache matching to commentId and postId and returning it in the form of ICommentDocument
    const cachedComments: ICommentDocument[] = await commentCache.getSingleCommentFromCache(postId, commentId);

    // if the comments are not present into cache then fteching it from DB
    const comments: ICommentDocument[] = cachedComments.length
      ? cachedComments
      : await commentService.getPostComments({ _id: new mongoose.Types.ObjectId(commentId) }, { createdAt: -1 });


    // returning the response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Single comment', comments: comments.length ? comments[0] : [] });
  }
}
