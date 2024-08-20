import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { authUserPayload } from '../../../../mocks/auth.mock';
import * as postServer from '../../../../shared/scokets/post';
import { newPost, postMockRequest, postMockResponse } from '../../../../mocks/post.mock';
import { postQueue } from '../../../../shared/services/queues/post.queue';
import { Delete } from '../../controllers/delete-post';
import { PostCache } from '../../../../shared/services/redis/post.cache';

jest.useFakeTimers();
jest.mock('../../../../shared/services/queues/base.queue');
jest.mock('../../../../shared/services/redis/post.cache');

Object.defineProperties(postServer, {
  socketIOPostObject: {
    value: new Server(),
    writable: true
  }
});

describe('Delete', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  it('should send correct json response', async () => {
    const req: Request = postMockRequest(newPost, authUserPayload, { postId: '12345' }) as Request;
    const res: Response = postMockResponse();
    jest.spyOn(postServer.socketIOPostObject, 'emit');
    jest.spyOn(PostCache.prototype, 'deletePostFromCache');
    jest.spyOn(postQueue, 'addPostJob');

    await Delete.prototype.post(req, res);
    expect(postServer.socketIOPostObject.emit).toHaveBeenCalledWith('delete post', req.params.postId);
    expect(PostCache.prototype.deletePostFromCache).toHaveBeenCalledWith(req.params.postId, `${req.currentUser?.userId}`);
    expect(postQueue.addPostJob).toHaveBeenCalledWith('deletePostFromDB', { keyOne: req.params.postId, keyTwo: req.currentUser?.userId });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Post deleted successfully'
    });
  });
});
