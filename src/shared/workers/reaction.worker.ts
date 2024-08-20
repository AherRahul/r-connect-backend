import { DoneCallback, Job } from 'bull';
import Logger from 'bunyan';
import { config } from '../../config';
import { reactionService } from '../services/db/reaction.service';

const log: Logger = config.createLogger('reactionWorker');

class ReactionWorker {


  // Add the reaction to the DB
  async addReactionToDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { data } = job;

      // Adding the reaction to DB
      await reactionService.addReactionDataToDB(data);

      // marking job completion to 100
      job.progress(100);

      // completed job
      done(null, data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }


  // job to remove preReaction from DB and update it with the new reaction
  async removeReactionFromDB(job: Job, done: DoneCallback): Promise<void> {
    try {
      const { data } = job;

      // remove preReaction and update new reaction into DB
      await reactionService.removeReactionDataFromDB(data);

      // marking job completion to 100
      job.progress(100);

      // completed job
      done(null, data);
    } catch (error) {
      log.error(error);
      done(error as Error);
    }
  }
}

export const reactionWorker: ReactionWorker = new ReactionWorker();
