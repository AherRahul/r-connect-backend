import { Job, DoneCallback } from 'bull';
import Logger from 'bunyan';
import { config } from '../../config';
import { postService } from '../services/db/post.service';

const log: Logger = config.createLogger('postWorker');

class PostWorker {


  // worker to create new post and saving it to DB
  async savePostToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { key, value } = job.data;

      // calling method os postService to save post data and inc the postsCount of user in DB
      await postService.addPostToDB(key, value);

      // marking the job complete
      job.progress(100);

      // job completed successfully
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }



  // worker to delete post from DB
  async deletePostFromDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      // destructuring the obj
      const { keyOne, keyTwo } = job.data;

      // calling service to deletePost
      await postService.deletePost(keyOne, keyTwo);

      // marking the job complete
      job.progress(100);

      // job completed successfully
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }



  // worker to Edit post from DB
  async updatePostInDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      // destructuring the obj
      const { key, value } = job.data;

      // calling service to editPost
      await postService.editPost(key, value);

      // marking the job complete
      job.progress(100);

      // job completed successfully
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const postWorker: PostWorker = new PostWorker();
