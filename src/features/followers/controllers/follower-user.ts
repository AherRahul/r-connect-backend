import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from 'http-status-codes';
import { FollowerCache } from '../../../shared/services/redis/follower.cache';
import { UserCache } from '../../../shared/services/redis/user.cache';
import { IUserDocument } from '../../user/interfaces/user.interface';
import { IFollowerData } from '../../followers/interfaces/follower.interface';
import mongoose from 'mongoose';
import { socketIOFollowerObject } from '../../../shared/scokets/follower';
import { followerQueue } from '../../../shared/services/queues/follower.queue';

const followerCache: FollowerCache = new FollowerCache();
const userCache: UserCache = new UserCache();

export class Add {

  // Add followers for the current logged in user
  public async follower(req: Request, res: Response): Promise<void> {

    // destructuring the Id of the user which logged in user want to follow
    const { followerId } = req.params;


    // update count in cache
    // incrementing followersCount in the user which is follwoed by current logged in user
    const followersCount: Promise<void> = followerCache.updateFollowersCountInCache(`${followerId}`, 'followersCount', 1);
    // incrementing followingCount in the current logged in user
    const followeeCount: Promise<void> = followerCache.updateFollowersCountInCache(`${req.currentUser!.userId}`, 'followingCount', 1);
    await Promise.all([followersCount, followeeCount]);


    // fetch the follwing and follower users from cache
    const cachedFollower: Promise<IUserDocument> = userCache.getUserFromCache(followerId) as Promise<IUserDocument>;
    const cachedFollowee: Promise<IUserDocument> = userCache.getUserFromCache(`${req.currentUser!.userId}`) as Promise<IUserDocument>;
    const response: [IUserDocument, IUserDocument] = await Promise.all([cachedFollower, cachedFollowee]);


    // creating follower Object Id to store follower obj into cache
    const followerObjectId: ObjectId = new ObjectId();
    const addFolloweeData: IFollowerData = Add.prototype.userData(response[0]);

    // emmiting socket event saying that followee is added
    socketIOFollowerObject.emit('add follower', addFolloweeData);


    // Saving follower and following info into the cache
    const addFollowerToCache: Promise<void> = followerCache.saveFollowerToCache(`following:${req.currentUser!.userId}`, `${followerId}`);
    const addFolloweeToCache: Promise<void> = followerCache.saveFollowerToCache(`followers:${followerId}`, `${req.currentUser!.userId}`);
    await Promise.all([addFollowerToCache, addFolloweeToCache]);


    // putting Add follower job into queue to save followers info into DB
    followerQueue.addFollowerJob('addFollowerToDB', {
      keyOne: `${req.currentUser!.userId}`,
      keyTwo: `${followerId}`,
      username: req.currentUser!.username,
      followerDocumentId: followerObjectId
    });

    // sending response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Following user now' });
  }


  private userData(user: IUserDocument): IFollowerData {
    return {
      _id: new mongoose.Types.ObjectId(user._id),
      username: user.username!,
      avatarColor: user.avatarColor!,
      postCount: user.postsCount,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      profilePicture: user.profilePicture,
      uId: user.uId!,
      userProfile: user
    };
  }
}
