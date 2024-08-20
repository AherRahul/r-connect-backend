import { Request, Response } from 'express';
import { authUserPayload, authMockRequest, authMockResponse } from '../../../../mocks/auth.mock';
import { UpdateSettings } from '../update-settings';
import { userQueue } from '../../../../shared/services/queues/user.queue';
import { UserCache } from '../../../../shared/services/redis/user.cache';

jest.useFakeTimers();
jest.mock('../../../../shared/services/queues/base.queue');
jest.mock('../../../../shared/services/redis/user.cache');

describe('Settings', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('update', () => {
    it('should call "addUserJob" methods', async () => {
      const settings = {
        messages: true,
        reactions: false,
        comments: true,
        follows: false
      };
      const req: Request = authMockRequest({}, settings, authUserPayload) as Request;
      const res: Response = authMockResponse();
      jest.spyOn(UserCache.prototype, 'updateSingleUserItemInCache');
      jest.spyOn(userQueue, 'addUserJob');

      await UpdateSettings.prototype.notification(req, res);
      expect(UserCache.prototype.updateSingleUserItemInCache).toHaveBeenCalledWith(`${req.currentUser?.userId}`, 'notifications', req.body);
      expect(userQueue.addUserJob).toHaveBeenCalledWith('updateNotificationSettings', {
        key: `${req.currentUser?.userId}`,
        value: req.body
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Notification settings updated successfully', settings: req.body });
    });
  });
});
