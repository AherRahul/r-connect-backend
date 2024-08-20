import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { authUserPayload } from '../../../../mocks/auth.mock';
import * as notificationServer from '../../../../shared/scokets/notification';
import { notificationMockRequest, notificationMockResponse } from '../../../../mocks/notification.mock';
import { notificationQueue } from '../../../../shared/services/queues/notification.queue';
import { Delete } from '../delete-notification';

jest.useFakeTimers();
jest.mock('../../../../shared/services/queues/base.queue');

Object.defineProperties(notificationServer, {
  socketIONotificationObject: {
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
    const req: Request = notificationMockRequest({}, authUserPayload, { notificationId: '12345' }) as Request;
    const res: Response = notificationMockResponse();
    jest.spyOn(notificationServer.socketIONotificationObject, 'emit');
    jest.spyOn(notificationQueue, 'addNotificationJob');

    await Delete.prototype.notification(req, res);
    expect(notificationServer.socketIONotificationObject.emit).toHaveBeenCalledWith('delete notification', req.params.notificationId);
    expect(notificationQueue.addNotificationJob).toHaveBeenCalledWith('deleteNotification', { key: req.params.notificationId });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Notification deleted successfully'
    });
  });
});
