import { joiValidation } from '../../../shared/global/decorators/joi-validation.decoration';
import { postSchema, postWithImageSchema, postWithVideoSchema } from '../schemes/post.schemes';
import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import HTTP_STATUS from 'http-status-codes';
import { IPostDocument } from '../interfaces/post.interface';
import { PostCache } from '../../../shared/services/redis/post.cache';
import { socketIOPostObject } from '../../../shared/scokets/post';
import { postQueue } from '../../../shared/services/queues/post.queue';
import { UploadApiResponse } from 'cloudinary';
import { uploads, videoUpload } from '../../../shared/global/helpers/cloudinary-upload';
import { BadRequestError } from '../../../shared/global/helpers/error-handler';
import { imageQueue } from '../../../shared/services/queues/image.queue';

const postCache: PostCache = new PostCache();

export class Create {
  @joiValidation(postSchema)
  public async post(req: Request, res: Response): Promise<void> {
    // destructuring req.body obj
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings } = req.body;

    // we are purposlyfully generating this ID, because we want to store the data into redis against that ID.
    // if we don't want to save the data into redis the mongoDB can create ID for us and store the data.
    const postObjectId: ObjectId = new ObjectId();

    // creating post obj
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount: 0,
      imgVersion: '',
      imgId: '',
      videoId: '',
      videoVersion: '',
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 }
    } as IPostDocument;

    // emmiting socket event
    socketIOPostObject.emit('add post', createdPost);

    // saving post data into radis cache
    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost
    });

    // adding post data into queue
    postQueue.addPostJob('addPostToDB', { key: req.currentUser!.userId, value: createdPost });

    // returning the response
    res.status(HTTP_STATUS.CREATED).json({ message: 'Post created successfully' });
  }

  @joiValidation(postWithImageSchema)
  public async postWithImage(req: Request, res: Response): Promise<void> {
    // destructuring req.body obj
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings, image } = req.body;

    // calling cloudinary upload method to upload image
    // we are not passing our own public_id, we allow cloudinary to generated public_id
    // if api not returns public_id then we are throwing an error saying bad-request
    const result: UploadApiResponse = (await uploads(image)) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    }

    // we are purposlyfully generating this ID, because we want to store the data into redis against that ID.
    // if we don't want to save the data into redis the mongoDB can create ID for us and store the data.
    const postObjectId: ObjectId = new ObjectId();
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount: 0,
      imgVersion: result.version.toString(),
      // using cloudinary generated public_id as imgId
      imgId: result.public_id,
      videoId: '',
      videoVersion: '',
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 }
    } as IPostDocument;

    // emmiting socket event
    socketIOPostObject.emit('add post', createdPost);

    // saving post to cache
    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost
    });

    // putting post job into post queue
    postQueue.addPostJob('addPostToDB', { key: req.currentUser!.userId, value: createdPost });

    // putting image job into image queue
    imageQueue.addImageJob('addImageToDB', {
      key: `${req.currentUser!.userId}`,
      imgId: result.public_id,
      imgVersion: result.version.toString()
    });

    // sending response back to client
    res.status(HTTP_STATUS.CREATED).json({ message: 'Post created with image successfully' });
  }

  @joiValidation(postWithVideoSchema)
  public async postWithVideo(req: Request, res: Response): Promise<void> {
    const { post, bgColor, privacy, gifUrl, profilePicture, feelings, video } = req.body;

    const result: UploadApiResponse = (await videoUpload(video)) as UploadApiResponse;
    if (!result?.public_id) {
      throw new BadRequestError(result.message);
    }

    const postObjectId: ObjectId = new ObjectId();
    const createdPost: IPostDocument = {
      _id: postObjectId,
      userId: req.currentUser!.userId,
      username: req.currentUser!.username,
      email: req.currentUser!.email,
      avatarColor: req.currentUser!.avatarColor,
      profilePicture,
      post,
      bgColor,
      feelings,
      privacy,
      gifUrl,
      commentsCount: 0,
      imgVersion: '',
      imgId: '',
      videoId: result.public_id,
      videoVersion: result.version.toString(),
      createdAt: new Date(),
      reactions: { like: 0, love: 0, happy: 0, sad: 0, wow: 0, angry: 0 }
    } as IPostDocument;
    socketIOPostObject.emit('add post', createdPost);
    await postCache.savePostToCache({
      key: postObjectId,
      currentUserId: `${req.currentUser!.userId}`,
      uId: `${req.currentUser!.uId}`,
      createdPost
    });
    postQueue.addPostJob('addPostToDB', { key: req.currentUser!.userId, value: createdPost });
    res.status(HTTP_STATUS.CREATED).json({ message: 'Post created with video successfully' });
  }
}
