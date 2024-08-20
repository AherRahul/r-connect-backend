import { BaseCache } from '../../services/redis/base.cache';
import Logger from 'bunyan';
import { find } from 'lodash';
import { config } from '../../../config';
import { ServerError } from '../../global/helpers/error-handler';
import { IReactionDocument, IReactions } from '../../../features/reactions/interfaces/reaction.interface';
import { Helpers } from '../../global/helpers/helpers';

const log: Logger = config.createLogger('reactionsCache');

export class ReactionCache extends BaseCache {
  constructor() {
    super('reactionsCache');
  }


  // saving reaction into cache
  public async savePostReactionToCache(
    key: string,
    reaction: IReactionDocument,
    postReactions: IReactions,
    // type - like | love | wow | happy | sad | angry
    type: string,
    previousReaction: string
  ): Promise<void> {
    try {

      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      // if previous reaction is there the first remove that reaction from post cache
      if (previousReaction) {
        this.removePostReactionFromCache(key, reaction.username, postReactions);
      }

      // if type is there then
      if (type) {

        // We are using list to store reactions. We have use set to store posts and user
        // LPUSH to push the element from left side into the (List)/array
        // RPUSH to push the element from right side into the (List)/array
        // push that reaction into reaction cache => stored as a list
        await this.client.LPUSH(`reactions:${key}`, JSON.stringify(reaction));

        // add the reaction into post cache
        await this.client.HSET(`posts:${key}`, 'reactions', JSON.stringify(postReactions));
      }
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }


  // removing user reaction on the post
  public async removePostReactionFromCache(key: string, username: string, postReactions: IReactions): Promise<void> {
    try {

      // checking if redis connection is open or not
      // if yes => don't create connection => else => connect
      if (!this.client.isOpen) {
        await this.client.connect();
      }

      /*
      * LRANGE is use to get the values from list cache. We have to provide start and end value,
      * from there based on that we are fetching the values of reaction from reaction cahche
      *
      * sending 0 as start and end as -1 in LRANGE method as we want to fetch entire list of reaction from cache
      * as we are storing reactionId as a key and storing entire reaction lsit object associated with that againt it
      */
      const response: string[] = await this.client.LRANGE(`reactions:${key}`, 0, -1);

      // preparing the obj to perform multiple action in one go on redis cache
      const multi: ReturnType<typeof this.client.multi> = this.client.multi();

      // feting the previous reaction of user on post
      const userPreviousReaction: IReactionDocument = this.getPreviousReaction(response, username) as IReactionDocument;

      // remove previous reaction from reaction cache stored as list
      multi.LREM(`reactions:${key}`, 1, JSON.stringify(userPreviousReaction));

      // execucting multiple action
      await multi.exec();

      // setting new/updated reaction on post
      await this.client.HSET(`posts:${key}`, 'reactions', JSON.stringify(postReactions));
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getReactionsFromCache(postId: string): Promise<[IReactionDocument[], number]> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const reactionsCount: number = await this.client.LLEN(`reactions:${postId}`);
      const response: string[] = await this.client.LRANGE(`reactions:${postId}`, 0, -1);
      const list: IReactionDocument[] = [];
      for (const item of response) {
        list.push(Helpers.parseJson(item));
      }
      return response.length ? [list, reactionsCount] : [[], 0];
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  public async getSingleReactionByUsernameFromCache(postId: string, username: string): Promise<[IReactionDocument, number] | []> {
    try {
      if (!this.client.isOpen) {
        await this.client.connect();
      }
      const response: string[] = await this.client.LRANGE(`reactions:${postId}`, 0, -1);
      const list: IReactionDocument[] = [];
      for (const item of response) {
        list.push(Helpers.parseJson(item));
      }
      const result: IReactionDocument = find(list, (listItem: IReactionDocument) => {
        return listItem?.postId === postId && listItem?.username === username;
      }) as IReactionDocument;

      return result ? [result, 1] : [];
    } catch (error) {
      log.error(error);
      throw new ServerError('Server error. Try again.');
    }
  }

  private getPreviousReaction(response: string[], username: string): IReactionDocument | undefined {
    const list: IReactionDocument[] = [];
    for (const item of response) {
      list.push(Helpers.parseJson(item) as IReactionDocument);
    }
    return find(list, (listItem: IReactionDocument) => {
      return listItem.username === username;
    });
  }
}
