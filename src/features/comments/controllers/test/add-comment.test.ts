import { Request, Response } from 'express';
import { authUserPayload } from '../../../../mocks/auth.mock';
import { reactionMockRequest, reactionMockResponse } from '../../../../mocks/reactions.mock';
import { CommentCache } from '../../../../shared/services/redis/comment.cache';
import { commentQueue } from '../../../../shared/services/queues/comment.queue';
import { Add } from '../add-comment';
import { existingUser } from '../../../../mocks/user.mock';

jest.useFakeTimers();
jest.mock('../../../../shared/services/queues/base.queue');
jest.mock('../../../../shared/services/redis/comment.cache');

describe('Add', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('should call savePostCommentToCache and addCommentJob methods', async () => {
    const req: Request = reactionMockRequest(
      {},
      {
        postId: '6027f77087c9d9ccb1555268',
        comment: 'This is a comment',
        profilePicture: 'https://place-hold.it/500x500',
        userTo: `${existingUser._id}`
      },
      authUserPayload
    ) as Request;
    const res: Response = reactionMockResponse();
    jest.spyOn(CommentCache.prototype, 'savePostCommentToCache');
    jest.spyOn(commentQueue, 'addCommentJob');

    await Add.prototype.comment(req, res);
    expect(CommentCache.prototype.savePostCommentToCache).toHaveBeenCalled();
    expect(commentQueue.addCommentJob).toHaveBeenCalled();
  });

  it('should send correct json response', async () => {
    const req: Request = reactionMockRequest(
      {},
      {
        postId: '6027f77087c9d9ccb1555268',
        comment: 'This is a comment',
        profilePicture: 'https://place-hold.it/500x500',
        userTo: `${existingUser._id}`
      },
      authUserPayload
    ) as Request;
    const res: Response = reactionMockResponse();

    await Add.prototype.comment(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Comment created successfully'
    });
  });
});
