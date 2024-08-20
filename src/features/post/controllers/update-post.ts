import { Request, Response } from 'express';
import { PostCache } from '../../../shared/services/redis/post.cache';
import HTTP_STATUS from 'http-status-codes';
import { postQueue } from '../../../shared/services/queues/post.queue';
import { socketIOPostObject } from '../../../shared/scokets/post';
import { joiValidation } from '../../../shared/global/decorators/joi-validation.decoration';
import { postSchema, postWithImageSchema, postWithVideoSchema } from '../schemes/post.schemes';
import { IPostDocument } from '../interfaces/post.interface';
import { UploadApiResponse } from 'cloudinary';
import { uploads, videoUpload } from '../../../shared/global/helpers/cloudinary-upload';
import { BadRequestError } from '../../../shared/global/helpers/error-handler';
import { imageQueue } from '../../../shared/services/queues/image.queue';

const postCache: PostCache = new PostCache();

export class Update {

  // updating post which don't have image
  @joiValidation(postSchema)
  public async posts(req: Request, res: Response): Promise<void> {

    // destructuring body obj
    const { post, bgColor, feelings, privacy, gifUrl, imgVersion, imgId, profilePicture } = req.body;

    // getiing postID
    const { postId } = req.params;

    // constructed update post obj
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      privacy,
      feelings,
      gifUrl,
      profilePicture,
      imgId,
      imgVersion,
      videoId: '',
      videoVersion: ''
    } as IPostDocument;


    // updating post in cache
    const postUpdated: IPostDocument = await postCache.updatePostInCache(postId, updatedPost);

    // emmiting the event that post is updated
    socketIOPostObject.emit('update post', postUpdated, 'posts');

    // saving post update into DB
    postQueue.addPostJob('updatePostInDB', { key: postId, value: postUpdated });

    // sending response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Post updated successfully' });
  }



  // updating post which have image
  @joiValidation(postWithImageSchema)
  public async postWithImage(req: Request, res: Response): Promise<void> {
    // updating post which don't have image
    const { imgId, imgVersion } = req.body;

    // checking imageId and imgVersion
    if (imgId && imgVersion) {
      // then updating the post and not the image. using same image
      // normal post update
      Update.prototype.updatePost(req);
    } else {
      // updating new image to the already created post
      //  upaloding image on cloudinary and the updating the post
      const result: UploadApiResponse = await Update.prototype.addImageToExistingPost(req);

      // if image upload fail on cloudinary
      if (!result.public_id) {
        throw new BadRequestError(result.message);
      }
    }

    // sending response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Post with image updated successfully' });
  }

  @joiValidation(postWithVideoSchema)
  public async postWithVideo(req: Request, res: Response): Promise<void> {
    const { videoId, videoVersion } = req.body;


    // checking videoId and videoVersion
    if (videoId && videoVersion) {
      // then updating the post and not the image. using same video
      // normal post update
      Update.prototype.updatePost(req);
    } else {
      // updating new video to the already created post
      //  upaloding video on cloudinary and the updating the post
      const result: UploadApiResponse = await Update.prototype.addImageToExistingPost(req);
      if (!result.public_id) {
        throw new BadRequestError(result.message);
      }
    }

    // sending response back to client
    res.status(HTTP_STATUS.OK).json({ message: 'Post with video updated successfully' });
  }

  private async updatePost(req: Request): Promise<void> {
    const { post, bgColor, feelings, privacy, gifUrl, imgVersion, imgId, profilePicture, videoId, videoVersion } = req.body;
    const { postId } = req.params;
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      privacy,
      feelings,
      gifUrl,
      profilePicture,
      imgId: imgId ? imgId : '',
      imgVersion: imgVersion ? imgVersion : '',
      videoId: videoId ? videoId : '',
      videoVersion: videoVersion ? videoVersion : ''
    } as IPostDocument;

    const postUpdated: IPostDocument = await postCache.updatePostInCache(postId, updatedPost);
    socketIOPostObject.emit('update post', postUpdated, 'posts');
    postQueue.addPostJob('updatePostInDB', { key: postId, value: postUpdated });
  }

  private async addImageToExistingPost(req: Request): Promise<UploadApiResponse> {
    const { post, bgColor, feelings, privacy, gifUrl, profilePicture, image, video } = req.body;
    const { postId } = req.params;
    const result: UploadApiResponse = image
      ? ((await uploads(image)) as UploadApiResponse)
      : ((await videoUpload(video)) as UploadApiResponse);
    if (!result?.public_id) {
      return result;
    }
    const updatedPost: IPostDocument = {
      post,
      bgColor,
      privacy,
      feelings,
      gifUrl,
      profilePicture,
      imgId: image ? result.public_id : '',
      imgVersion: image ? result.version.toString() : '',
      videoId: video ? result.public_id : '',
      videoVersion: video ? result.version.toString() : ''
    } as IPostDocument;

    const postUpdated: IPostDocument = await postCache.updatePostInCache(postId, updatedPost);
    socketIOPostObject.emit('update post', postUpdated, 'posts');
    postQueue.addPostJob('updatePostInDB', { key: postId, value: postUpdated });
    if (image) {
      imageQueue.addImageJob('addImageToDB', {
        key: `${req.currentUser!.userId}`,
        imgId: result.public_id,
        imgVersion: result.version.toString()
      });
    }
    return result;
  }
}
