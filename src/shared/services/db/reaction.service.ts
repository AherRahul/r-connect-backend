import { Helpers } from '../../global/helpers/helpers';
import { IPostDocument } from '../../../features/post/interfaces/post.interface';
import { PostModel } from '../../../features/post/models/post.schema';
import { IQueryReaction, IReactionDocument, IReactionJob } from '../../../features/reactions/interfaces/reaction.interface';
import { ReactionModel } from '../../../features/reactions/models/reaction.schema';
import { UserCache } from '../../../shared/services/redis/user.cache';
import { IUserDocument } from '../../../features/user/interfaces/user.interface';
import { omit } from 'lodash';
import mongoose from 'mongoose';
import { INotificationDocument, INotificationTemplate } from '../../../features/notifications/interfaces/notification.interface';
import { NotificationModel } from '../../../features/notifications/models/notification.schema';
import { socketIONotificationObject } from '../../../shared/scokets/notification';
import { notificationTemplate } from '../emails/templates/notifications/notification-template';
import { emailQueue } from '../queues/email.queue';

const userCache: UserCache = new UserCache();

class ReactionService {


  // Adding reaction to DB
  public async addReactionDataToDB(reactionData: IReactionJob): Promise<void> {

    // Destructuring reaction obj
    const { postId, userTo, userFrom, username, type, previousReaction, reactionObject } = reactionData;

    // Forming IReactionDocument obj
    let updatedReactionObject: IReactionDocument = reactionObject as IReactionDocument;

    // if previousReaction is present then triggering scoket event to acknowledge subscriber that reaction is updated
    if (previousReaction) {
      updatedReactionObject = omit(reactionObject, ['_id']);
    }

    // updating reaction in db and cache
    const updatedReaction: [IUserDocument, IReactionDocument, IPostDocument] = (await Promise.all([

      // fetching the user from cache
      userCache.getUserFromCache(`${userTo}`),

      // updating the previous reaction with the updated reaction in reactionModel
      ReactionModel.replaceOne({ postId, type: previousReaction, username }, updatedReactionObject, { upsert: true }),

      // finding the post and update the reaction into postModel
      PostModel.findOneAndUpdate(
        { _id: postId },
        {
          $inc: {
            [`reactions.${previousReaction}`]: -1,
            [`reactions.${type}`]: 1
          }
        },
        { new: true }
      )
    ])) as unknown as [IUserDocument, IReactionDocument, IPostDocument];

    // if user A is reacting on user B's post then
    if (updatedReaction[0].notifications.reactions && userTo !== userFrom) {

      // creaeting notifation model
      const notificationModel: INotificationDocument = new NotificationModel();

      // constructing notification obj
      const notifications = await notificationModel.insertNotification({
        userFrom: userFrom as string,
        userTo: userTo as string,
        message: `${username} reacted to your post.`,
        notificationType: 'reactions',
        entityId: new mongoose.Types.ObjectId(postId),
        createdItemId: new mongoose.Types.ObjectId(updatedReaction[1]._id!),
        createdAt: new Date(),
        comment: '',
        post: updatedReaction[2].post,
        imgId: updatedReaction[2].imgId!,
        imgVersion: updatedReaction[2].imgVersion!,
        gifUrl: updatedReaction[2].gifUrl!,
        reaction: type!
      });

      // emmiting the notification to user B saying that user A is reacted on your post
      socketIONotificationObject.emit('insert notification', notifications, { userTo });

      // generating email template for user B saying that user A is reacted on your post
      const templateParams: INotificationTemplate = {
        username: updatedReaction[0].username!,
        message: `${username} reacted to your post.`,
        header: 'Post Reaction Notification'
      };

      // getiing template ready
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);

      // sending email to user B about reaction update on his post
      emailQueue.addEmailJob('reactionsEmail', {
        receiverEmail: updatedReaction[0].email!,
        template,
        subject: 'Post reaction notification'
      });
    }
  }




  // remove reaction on post from DB
  public async removeReactionDataFromDB(reactionData: IReactionJob): Promise<void> {

    // Destructuring reactionData obj
    const { postId, previousReaction, username } = reactionData;


    await Promise.all([

      // deleting the reaction from reactionModel (reaction tabel)
      ReactionModel.deleteOne({ postId, type: previousReaction, username }),

      // update reaction info into postModel (Post tabel)
      PostModel.updateOne(
        { _id: postId },
        {
          $inc: {
            [`reactions.${previousReaction}`]: -1
          }
        },
        { new: true }
      )
    ]);
  }




  // feting the post reactions from DB
  public async getPostReactions(query: IQueryReaction, sort: Record<string, 1 | -1>): Promise<[IReactionDocument[], number]> {

    // feting the post recation from reactionModel (reaction tabel)
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([{ $match: query }, { $sort: sort }]);

    // returning reaction back to client
    return [reactions, reactions.length];
  }




  // fetch the single post reaction form DB by userName
  public async getSinglePostReactionByUsername(postId: string, username: string): Promise<[IReactionDocument, number] | []> {

    // feting the post recation from reactionModel (reaction tabel) matching to postId and username
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: { postId: new mongoose.Types.ObjectId(postId), username: Helpers.firstLetterUppercase(username) } }
    ]);

    // returning back the reaction info back to client
    return reactions.length ? [reactions[0], 1] : [];
  }



  // fetch the All post reaction form DB by userName
  public async getReactionsByUsername(username: string): Promise<IReactionDocument[]> {

    // feting the posts recation from reactionModel (reaction tabel) matching to username
    const reactions: IReactionDocument[] = await ReactionModel.aggregate([
      { $match: { username: Helpers.firstLetterUppercase(username) } }
    ]);

    // returning back the reaction info back to client
    return reactions;
  }
}

export const reactionService: ReactionService = new ReactionService();
