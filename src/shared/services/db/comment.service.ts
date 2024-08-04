import { ICommentDocument, ICommentJob, ICommentNameList, IQueryComment } from '../../../features/comments/interfaces/comment.interface';
import { CommentsModel } from '../../../features/comments/models/comment.schema';
import { IPostDocument } from '../../../features/post/interfaces/post.interface';
import { PostModel } from '../../../features/post/models/post.schema';
import mongoose, { Query } from 'mongoose';
import { UserCache } from '../../../shared/services/redis/user.cache';
import { IUserDocument } from '../../../features/user/interfaces/user.interface';
import { NotificationModel } from '../../../features/notification/models/notification.schema';
import { INotificationDocument, INotificationTemplate } from '../../../features/notification/interfaces/notification.interface';
import { socketIONotificationObject } from '../../../shared/scokets/notification';
import { notificationTemplate } from '../../../shared/services/emails/templates/notifications/notification-template';
import { emailQueue } from '../../../shared/services/queues/email.queue';

const userCache: UserCache = new UserCache();

class CommentService {

  // Saving comment to DB
  public async addCommentToDB(commentData: ICommentJob): Promise<void> {

    // destructuring the data
    const { postId, userTo, userFrom, comment, username } = commentData;

    // creating the obj of comment to store it into the DB
    const comments: Promise<ICommentDocument> = CommentsModel.create(comment);

    // creating the query to increment the commentCount into post DB. If commentCount is there then update that existing commentCount else create new commentCount
    const post: Query<IPostDocument, IPostDocument> = PostModel.findOneAndUpdate(
      { _id: postId },
      { $inc: { commentsCount: 1 } },
      { new: true }
    ) as Query<IPostDocument, IPostDocument>;

    // feting the user from cache to send notifiaction that comment is added on you post
    const user: Promise<IUserDocument> = userCache.getUserFromCache(userTo) as Promise<IUserDocument>;

    // await till all the DB operations are not completed =>  comments creating, commentCount inc by 1 in post, fetching the user from cache
    const response: [ICommentDocument, IPostDocument, IUserDocument] = await Promise.all([comments, post, user]);


    // if commneted user and post created user are different
    if (response[2].notifications.comments && userFrom !== userTo) {

      // creating the notifModel obj
      const notificationModel: INotificationDocument = new NotificationModel();

      // creating notif
      const notifications = await notificationModel.insertNotification({
        userFrom,
        userTo,
        message: `${username} commented on your post.`,
        notificationType: 'comment',
        entityId: new mongoose.Types.ObjectId(postId),
        createdItemId: new mongoose.Types.ObjectId(response[0]._id!),
        createdAt: new Date(),
        comment: comment.comment,
        post: response[1].post,
        imgId: response[1].imgId!,
        imgVersion: response[1].imgVersion!,
        gifUrl: response[1].gifUrl!,
        reaction: ''
      });

      // emmiting the event saying comment added
      socketIONotificationObject.emit('insert notification', notifications, { userTo });

      // generating email template for notif
      const templateParams: INotificationTemplate = {
        username: response[2].username!,
        message: `${username} commented on your post.`,
        header: 'Comment Notification'
      };

      // getting template ready
      const template: string = notificationTemplate.notificationMessageTemplate(templateParams);

      // add email job into the queue to send notif email to user
      emailQueue.addEmailJob('commentsEmail', { receiverEmail: response[2].email!, template, subject: 'Post notification' });
    }
  }


  // feth the comment from DB
  public async getPostComments(query: IQueryComment, sort: Record<string, 1 | -1>): Promise<ICommentDocument[]> {

    // get the comment which are matching to the query
    const comments: ICommentDocument[] = await CommentsModel.aggregate([{ $match: query }, { $sort: sort }]);

    // returning the comment
    return comments;
  }


  // get the name of all the users which are commented on the post
  public async getPostCommentNames(query: IQueryComment, sort: Record<string, 1 | -1>): Promise<ICommentNameList[]> {

    // get the list of usernames which are commented on the post along with it's count
    const commentsNamesList: ICommentNameList[] = await CommentsModel.aggregate([
      { $match: query },
      { $sort: sort },
      { $group: { _id: null, names: { $addToSet: '$username' }, count: { $sum: 1 } } },
      { $project: { _id: 0 } }
    ]);

    // retuning back the response
    return commentsNamesList;
  }
}

export const commentService: CommentService = new CommentService();
