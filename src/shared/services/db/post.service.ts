import { IPostDocument, IGetPostsQuery, IQueryComplete, IQueryDeleted } from '../../../features/post/interfaces/post.interface';
import { PostModel } from '../../../features/post/models/post.schema';
import { IUserDocument } from '../../../features/user/interfaces/user.interface';
import { UserModel } from '../../../features/user/models/user.schema';
import { Query, UpdateQuery } from 'mongoose';

class PostService {



  // saving post to DB
  public async addPostToDB(userId: string, createdPost: IPostDocument): Promise<void> {
    // saving the post in the DB
    const post: Promise<IPostDocument> = PostModel.create(createdPost);

    // updating the postsCount of user by one and saving into DB
    const user: UpdateQuery<IUserDocument> = UserModel.updateOne({ _id: userId }, { $inc: { postsCount: 1 } });

    // waiting for both the DB operations to complete
    await Promise.all([post, user]);
  }




  // fetch the post fromm DB
  public async getPosts(query: IGetPostsQuery, skip = 0, limit = 0, sort: Record<string, 1 | -1>): Promise<IPostDocument[]> {
    let postQuery = {};

    // for images and gif
    if (query?.imgId && query?.gifUrl) {

      // retrun post whose images or gif is not empty
      postQuery = { $or: [{ imgId: { $ne: '' } }, { gifUrl: { $ne: '' } }] };
    } else if (query?.videoId) {

      // retrun post whose video is not empty
      postQuery = { $or: [{ videoId: { $ne: '' } }] };
    } else {

      // retrun post which don't have video or image/gif
      postQuery = query;
    }

    // executing the query
    const posts: IPostDocument[] = await PostModel.aggregate([
      { $match: postQuery },
      { $sort: sort },
      // used for pagination => for skiping
      { $skip: skip },
      // used for pagination => setting limit
      { $limit: limit }
    ]);

    // retruning the posts
    return posts;
  }



  // fetch the postCount from DB
  public async postsCount(): Promise<number> {

    // executing the query to fetch the count of documents
    const count: number = await PostModel.find({}).countDocuments();

    // retruning the count
    return count;
  }



  // Delete post from DB
  public async deletePost(postId: string, userId: string): Promise<void> {
    // deleting the post from DB
    const deletePost: Query<IQueryComplete & IQueryDeleted, IPostDocument> = PostModel.deleteOne({ _id: postId });
    // delete reactions here

    // decreament postCount of user and save into DB
    const decrementPostCount: UpdateQuery<IUserDocument> = UserModel.updateOne({ _id: userId }, { $inc: { postsCount: -1 } });

    // await till execute all the operation
    await Promise.all([deletePost, decrementPostCount]);
  }



  // editing the post in DB
  public async editPost(postId: string, updatedPost: IPostDocument): Promise<void> {
    // update the post in DB
    const updatePost: UpdateQuery<IPostDocument> = PostModel.updateOne({ _id: postId }, { $set: updatedPost });

    // await till executing the update operation
    await Promise.all([updatePost]);
  }
}

export const postService: PostService = new PostService();
