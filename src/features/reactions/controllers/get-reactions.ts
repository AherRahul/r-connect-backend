import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { IReactionDocument } from '../interfaces/reaction.interface';
import { ReactionCache } from '../../../shared/services/redis/reaction.cache';
import { reactionService } from '../../../shared/services/db/reaction.service';
import mongoose from 'mongoose';

const reactionCache: ReactionCache = new ReactionCache();

export class Get {
  // get the recation on the postID
  public async reactions(req: Request, res: Response): Promise<void> {

    // destructuring req obj to get postID
    const { postId } = req.params;

    // get the reaction from cache and saving it in the format of IReactionDocument
    const cachedReactions: [IReactionDocument[], number] = await reactionCache.getReactionsFromCache(postId);

    // if reaction is not present in the cache the fetching it from the DB and saving it in the format of IReactionDocument
    const reactions: [IReactionDocument[], number] = cachedReactions[0].length
      ? cachedReactions
      : await reactionService.getPostReactions({ postId: new mongoose.Types.ObjectId(postId) }, { createdAt: -1 });

    // returning the response back to the client
    res.status(HTTP_STATUS.OK).json({ message: 'Post reactions', reactions: reactions[0], count: reactions[1] });
  }


  // get the single reaction on the post made by user
  public async singleReactionByUsername(req: Request, res: Response): Promise<void> {

    // destructuring req obj to get postID and username
    const { postId, username } = req.params;

    // get the reaction from cache and saving it in the format of IReactionDocument
    const cachedReaction: [IReactionDocument, number] | [] = await reactionCache.getSingleReactionByUsernameFromCache(postId, username);

    // if reaction is not present in the cache the fetching it from the DB and saving it in the format of IReactionDocument
    const reactions: [IReactionDocument, number] | [] = cachedReaction.length
      ? cachedReaction
      : await reactionService.getSinglePostReactionByUsername(postId, username);

    // returning the response back to the client
    res.status(HTTP_STATUS.OK).json({
      message: 'Single post reaction by username',
      reactions: reactions.length ? reactions[0] : {},
      count: reactions.length ? reactions[1] : 0
    });
  }

  // get all user reaction by username
  public async reactionsByUsername(req: Request, res: Response): Promise<void> {

    // destructuring req obj to get username
    const { username } = req.params;

    // get the reaction from DB and saving it in the format of IReactionDocument
    const reactions: IReactionDocument[] = await reactionService.getReactionsByUsername(username);

    // returning the response back to the client
    res.status(HTTP_STATUS.OK).json({ message: 'All user reactions by username', reactions });
  }
}
