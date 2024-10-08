import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '../../config';
import { commentService } from '../services/db/comment.service';

const log: Logger = config.createLogger('commentWorker');

class CommentWorker {
  async addCommentToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { data } = job;

      // save commnet to the DB
      await commentService.addCommentToDB(data);
      job.progress(100);
      done(null, job.data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const commentWorker: CommentWorker = new CommentWorker();
