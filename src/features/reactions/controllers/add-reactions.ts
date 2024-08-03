import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from 'http-status-codes';
import { joiValidation } from '../../../shared/global/decorators/joi-validation.decoration';
import { addReactionSchema } from '../schemes/reactions';
import { IReactionDocument, IReactionJob } from '../interfaces/reaction.interface';
import { ReactionCache } from '../../../shared/services/redis/reaction.cache';
import { reactionQueue } from '../../../shared/services/queues/reaction.queue';

const reactionCache: ReactionCache = new ReactionCache();

export class Add {
  @joiValidation(addReactionSchema)

  // Add reaction to DB
  public async reaction(req: Request, res: Response): Promise<void> {

    // destructuring req.body obj
    const { userTo, postId, type, previousReaction, postReactions, profilePicture } = req.body;

    // preparing IReactionDocument type obj
    const reactionObject: IReactionDocument = {
      _id: new ObjectId(),
      postId,
      // type - like | love | wow | happy | sad | angry
      type,
      avataColor: req.currentUser!.avatarColor,
      username: req.currentUser!.username,
      profilePicture
    } as IReactionDocument;


    // Adding recation into cache
    await reactionCache.savePostReactionToCache(postId, reactionObject, postReactions, type, previousReaction);


    // preparing IReactionJob type obj
    const databaseReactionData: IReactionJob = {
      postId,
      userTo,
      userFrom: req.currentUser!.userId,
      username: req.currentUser!.username,
      type,
      previousReaction,
      reactionObject
    };

    // Adding Add reaction job into queue
    reactionQueue.addReactionJob('addReactionToDB', databaseReactionData);

    // returning back the response back to the client
    res.status(HTTP_STATUS.OK).json({ message: 'Reaction added successfully' });
  }
}
