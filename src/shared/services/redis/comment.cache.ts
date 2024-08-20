import { BaseCache } from '../redis/base.cache';
import Logger from 'bunyan';
import { find } from 'lodash';
import { config } from '../../../config';
import { ServerError } from '../../global/helpers/error-handler';
import { Helpers } from '../../global/helpers/helpers';
import { ICommentDocument, ICommentNameList } from '../../../features/comments/interfaces/comment.interface';

const log: Logger = config.createLogger('commentsCache');

export class CommentCache extends BaseCache {
  constructor() {
    super('commentsCache');
  }


  // Save post into the cache
  public async savePostCommentToCache(postId: string, value: string): Promise<void> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // if previous commnent is there the first remove that commnent from post cache
      await this.client.LPUSH(`comments:${postId}`, value);

      // get the post from cache to update the commnetCount
      const commentsCount: string[] = await this.client.HMGET(`posts:${postId}`, 'commentsCount');
      let count: number = Helpers.parseJson(commentsCount[0]) as number;
      count += 1;

      // setting back to post DB
      await this.client.HSET(`posts:${postId}`, 'commentsCount', `${count}`);
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // get all the comments on particular post from cache
  public async getCommentsFromCache(postId: string): Promise<ICommentDocument[]> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // getting list of all the comments which are matching postID
      const reply: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);

      // creating array of comments
      const list: ICommentDocument[] = [];
      for (const item of reply) {
        list.push(Helpers.parseJson(item));
      }

      // returning the comments array back
      return list;
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // get the list of all the user name which are commneted on the post
  public async getCommentsNamesFromCache(postId: string): Promise<ICommentNameList[]> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // get the total number of commnets on particular postID
      const commentsCount: number = await this.client.LLEN(`comments:${postId}`);

      // get all the commnets which are matching to the postID
      const comments: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);

      // creating array of comments
      const list: string[] = [];
      for (const item of comments) {
        const comment: ICommentDocument = Helpers.parseJson(item) as ICommentDocument;
        list.push(comment.username);
      }

      const response: ICommentNameList = {
        count: commentsCount,
        names: list
      };

      // returning the response back
      return [response];
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // get single comment which is matching to coomentID and posrID
  public async getSingleCommentFromCache(postId: string, commentId: string): Promise<ICommentDocument[]> {
    try {
      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // get all the commnets which are matching to the postID
      const comments: string[] = await this.client.LRANGE(`comments:${postId}`, 0, -1);

      // pushing it into the array
      const list: ICommentDocument[] = [];
      for (const item of comments) {
        list.push(Helpers.parseJson(item));
      }

      // picking only that post whose commnetId matched to passed commnetID
      const result: ICommentDocument = find(list, (listItem: ICommentDocument) => {
        return listItem._id === commentId;
      }) as ICommentDocument;


      // returning the response back
      return [result];
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }
}
