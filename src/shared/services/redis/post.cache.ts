import { BaseCache } from './base.cache';
import Logger from 'bunyan';
import { config } from '../../../config';
import { ServerError } from '../../global/helpers/error-handler';
import { ISavePostToCache, IPostDocument } from '../../../features/post/interfaces/post.interface';
import { Helpers } from '../../global/helpers/helpers';
import { RedisCommandRawReply } from '@redis/client/dist/lib/commands';
import { IReactions } from '../../../features/post/interfaces/post.interface';

const log: Logger = config.createLogger('postCache');

export type PostCacheMultiType = string | number | Buffer | RedisCommandRawReply[] | IPostDocument | IPostDocument[];

export class PostCache extends BaseCache {
  constructor() {
    super('postCache');
  }

  public async savePostToCache(data: ISavePostToCache): Promise<void> {
    // destructure data property
    const { key, currentUserId, uId, createdPost } = data;

    // destructuring the createdPost property
    const {
      _id,
      userId,
      username,
      email,
      avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount,
      imgVersion,
      imgId,
      videoId,
      videoVersion,
      reactions,
      createdAt
    } = createdPost;

    // preparing dataToSave obj to save into cahce as key value pair
    const dataToSave = {
      '_id': `${_id}`,
      'userId': `${userId}`,
      'username': `${username}`,
      'email': `${email}`,
      'avatarColor': `${avatarColor}`,
      'profilePicture': `${profilePicture}`,
      'post': `${post}`,
      'bgColor': `${bgColor}`,
      'feelings': `${feelings}`,
      'privacy': `${privacy}`,
      'gifUrl': `${gifUrl}`,
      'commentsCount': `${commentsCount}`,
      'reactions': JSON.stringify(reactions),
      'imgVersion': `${imgVersion}`,
      'imgId': `${imgId}`,
      'videoId': `${videoId}`,
      'videoVersion': `${videoVersion}`,
      'createdAt': `${createdAt}`
    };

    // saving post to cache
    try {

      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // fetching postCount property to increment by one
      const postCount: string[] = await this.client.HMGET(`users:${currentUserId}`, 'postsCount');

      // creating a multi to call multiple redis command at one go. so no need to call trigger each command one by one
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();

      //
      await this.client.ZADD('post', { score: parseInt(uId, 10), value: `${key}` });

      //
      for(const [itemKey, itemValue] of Object.entries(dataToSave)) {
        multi.HSET(`posts:${key}`, `${itemKey}`, `${itemValue}`);
      }

      // incrementing the post count by one
      const count: number = parseInt(postCount[0], 10) + 1;

      // saving the post count into user
      multi.HSET(`users:${currentUserId}`, 'postsCount', count);

      // executing the multiple redis methods
      multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  // fetching the post from the cache
  public async getPostsFromCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      /*
      * ZRANGE is use to get the values from post's sorted set => we will get all the stored postID
      * from there and based on that we are fetching the values of post from cahche
      */

      const reply: string[] = await this.client.ZRANGE(key, start, end);

      // HGETALL to get all the property of obj stored against that key
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.HGETALL(`posts:${value}`);
      }

      // execute multiple command
      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postReplies: IPostDocument[] = [];

      // iterating on post and pushing into array
      for (const post of replies as IPostDocument[]) {
        post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
        post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
        post.createdAt = new Date(Helpers.parseJson(`${post.createdAt}`)) as Date;
        postReplies.push(post);
      }

      // returning the post
      return postReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // fetching the total number of post in the cache
  public async getTotalPostsInCache(): Promise<number> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // ZCARD => retruns number of items present in sorted set of passed cache as args
      const count: number = await this.client.ZCARD('post');

      // returning the count
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // fetching the post with images from the cache
  public async getPostsWithImagesFromCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      /*
      * ZRANGE is use to get the values from post's sorted set => we will get all the stored postID
      * from there and based on that we are fetching the values of post from cahche
      */
      const reply: string[] = await this.client.ZRANGE(key, start, end);

      // HGETALL to get all the property of obj stored against that key
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.HGETALL(`posts:${value}`);
      }

      // execute multiple command
      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postWithImages: IPostDocument[] = [];

      // iterating on post and pushing into array
      for (const post of replies as IPostDocument[]) {
        if ((post.imgId && post.imgVersion) || post.gifUrl) {
          post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
          post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
          post.createdAt = new Date(Helpers.parseJson(`${post.createdAt}`)) as Date;
          postWithImages.push(post);
        }
      }

      // returning the post with images
      return postWithImages;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // fetching the post with videos from the cache
  public async getPostsWithVideosFromCache(key: string, start: number, end: number): Promise<IPostDocument[]> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }


      /*
      * ZRANGE is use to get the values from post's sorted set => we will get all the stored postID
      * from there and based on that we are fetching the values of post from cahche
      */
      const reply: string[] = await this.client.ZRANGE(key, start, end);


      // HGETALL to get all the property of obj stored against that key
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.HGETALL(`posts:${value}`);
      }


      // execute multiple command
      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postWithVideos: IPostDocument[] = [];


      // iterating on post and pushing into array
      for (const post of replies as IPostDocument[]) {
        if (post.videoId && post.videoVersion) {
          post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
          post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
          post.createdAt = new Date(Helpers.parseJson(`${post.createdAt}`)) as Date;
          postWithVideos.push(post);
        }
      }

      // returning the post with videos
      return postWithVideos;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // fetching the list of post from the cache associated with the user. (uId)
  public async getUserPostsFromCache(key: string, uId: number): Promise<IPostDocument[]> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      /*
      * ZRANGE is use to get the values from post's sorted set => we will get all the stored postID
      * from there and based on that we are fetching the values of post from cahche
      *
      * sending uId as strat and end in ZRANGE method
      * uId stored in 'SCORE' so passing it as well
      */
      const reply: string[] = await this.client.ZRANGE(key, uId, uId, { REV: true, BY: 'SCORE' });

      // HGETALL to get all the property of obj stored against that key
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();
      for (const value of reply) {
        multi.HGETALL(`posts:${value}`);
      }


      // execute multiple command
      const replies: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postReplies: IPostDocument[] = [];


      // iterating on post and pushing into array
      for (const post of replies as IPostDocument[]) {
        post.commentsCount = Helpers.parseJson(`${post.commentsCount}`) as number;
        post.reactions = Helpers.parseJson(`${post.reactions}`) as IReactions;
        post.createdAt = new Date(Helpers.parseJson(`${post.createdAt}`)) as Date;
        postReplies.push(post);
      }

      // returning the post
      return postReplies;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // fetching the total number of post in the cache for user passed as uId
  public async getTotalUserPostsInCache(uId: number): Promise<number> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // ZCOUNT => retruns number of items present in sorted set of passed cache as args
      // min and max of score
      const count: number = await this.client.ZCOUNT('post', uId, uId);

      // returning the count
      return count;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  // deleting post from cache
  public async deletePostFromCache(key: string, currentUserId: string): Promise<void> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // get the postCount
      const postCount: string[] = await this.client.HMGET(`users:${currentUserId}`, 'postsCount');

      // creating obj for multi
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();

      // ZREM is use to remove key from set, require a cache name and key as args
      multi.ZREM('post', `${key}`);

      // is use to delete all values stored against key from cache
      multi.DEL(`posts:${key}`);
      // multi.DEL(`comments:${key}`);
      // multi.DEL(`reactions:${key}`);

      // decrementing postCount and updating that into user
      const count: number = parseInt(postCount[0], 10) - 1;
      multi.HSET(`users:${currentUserId}`, 'postsCount', count);

      // executing all commands
      await multi.exec();
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  // updating post in cache
  public async updatePostInCache(key: string, updatedPost: IPostDocument): Promise<IPostDocument> {
    // destructuring the post obj
    const { post, bgColor, feelings, privacy, gifUrl, imgVersion, imgId, videoId, videoVersion, profilePicture } = updatedPost;


    // preparing dataToSave obj to save into cahce as key value pair
    const dataToSave = {
      'post': `${post}`,
      'bgColor': `${bgColor}`,
      'feelings': `${feelings}`,
      'privacy': `${privacy}`,
      'gifUrl': `${gifUrl}`,
      'videoId': `${videoId}`,
      'videoVersion': `${videoVersion}`,
      'profilePicture': `${profilePicture}`,
      'imgVersion': `${imgVersion}`,
      'imgId': `${imgId}`
    };

    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // iterating on all properties of dataToSave obj and save that into cache
      for(const [itemKey, itemValue] of Object.entries(dataToSave)) {
        await this.client.HSET(`posts:${key}`, `${itemKey}`, `${itemValue}`);
      }

      // creating obj for multi
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();

      // get all posts
      multi.HGETALL(`posts:${key}`);

      // execute the multi method
      const reply: PostCacheMultiType = (await multi.exec()) as PostCacheMultiType;
      const postReply = reply as IPostDocument[];


      // postReply[0].commentsCount = Helpers.parseJson(`${postReply[0].commentsCount}`) as number;
      // postReply[0].reactions = Helpers.parseJson(`${postReply[0].reactions}`) as IReactions;

      // setting string date to actual date format
      postReply[0].createdAt = new Date(Helpers.parseJson(`${postReply[0].createdAt}`)) as Date;

      // response sending back to client
      return postReply[0];
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
