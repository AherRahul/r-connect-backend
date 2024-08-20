import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from 'http-status-codes';
import mongoose from 'mongoose';
import { FollowerCache } from '../../../shared/services/redis/follower.cache';
import { IFollowerData } from '../interfaces/follower.interface';
import { followerService } from '../../../shared/services/db/follower.service';

const followerCache: FollowerCache = new FollowerCache();

export class Get {



  // FETCH FOLLOWING
  // Get the list of user which are following to the current loggedin user
  public async userFollowing(req: Request, res: Response): Promise<void> {

    // get the ID of current loggedIn user
    const userObjectId: ObjectId = new mongoose.Types.ObjectId(req.currentUser!.userId);

    // fetch the following user from cache
    const cachedFollowees: IFollowerData[] = await followerCache.getFollowersFromCache(`following:${req.currentUser!.userId}`);

    // if following user not present in cache then fetching them from DB
    const following: IFollowerData[] = cachedFollowees.length ? cachedFollowees : await followerService.getFolloweeData(userObjectId);

    // sending response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'User following', following });
  }



  // FETCH FOLLOWERS
  // Get the list of user which are followers of user passed as params
  public async userFollowers(req: Request, res: Response): Promise<void> {

    // get the ID of current loggedIn user
    const userObjectId: ObjectId = new mongoose.Types.ObjectId(req.params.userId);

    // fetch all the followers of user passed in params
    const cachedFollowers: IFollowerData[] = await followerCache.getFollowersFromCache(`followers:${req.params.userId}`);

    // if followers user not present in cache then fetching them from DB
    const followers: IFollowerData[] = cachedFollowers.length ? cachedFollowers : await followerService.getFollowerData(userObjectId);

    // sending response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'User followers', followers });
  }
}
