import { Request, Response } from 'express';
import HTTP_STATUS from 'http-status-codes';
import { IReactionJob } from '../interfaces/reaction.interface';
import { ReactionCache } from '../../../shared/services/redis/reaction.cache';
import { reactionQueue } from '../../../shared/services/queues/reaction.queue';

const reactionCache: ReactionCache = new ReactionCache();

export class Remove {

  // remove the user reaction on the post
  public async reaction(req: Request, res: Response): Promise<void> {

    // destructuring the req.params obj
    const { postId, previousReaction, postReactions } = req.params;

    // remove reaction from cache
    await reactionCache.removePostReactionFromCache(postId, `${req.currentUser!.username}`, JSON.parse(postReactions));

    // contructing the IReactionJob type obj
    const databaseReactionData: IReactionJob = {
      postId,
      username: req.currentUser!.username,
      previousReaction
    };

    // putting remove reaction job into queue to remove reaction from DB
    reactionQueue.addReactionJob('removeReactionFromDB', databaseReactionData);

    // sending response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Reaction removed from post' });
  }
}
