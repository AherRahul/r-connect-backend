import { Request, Response } from 'express';
import { Server } from 'socket.io';
import { authUserPayload } from '../../../../mocks/auth.mock';
import * as imageServer from '../../../../shared/scokets/image';
import { fileDocumentMock, imagesMockRequest, imagesMockResponse } from '../../../../mocks/image.mock';
import { imageQueue } from '../../../../shared/services/queues/image.queue';
import { Delete } from '../delete-image';
import { imageService } from '../../../../shared/services/db/image.service';
import { UserCache } from '../../../../shared/services/redis/user.cache';

jest.useFakeTimers();
jest.mock('../../../../shared/services/queues/base.queue');
jest.mock('../../../../shared/services/redis/user.cache');

Object.defineProperties(imageServer, {
  socketIOImageObject: {
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

  it('should send correct json response for image upload', async () => {
    const req: Request = imagesMockRequest({}, {}, authUserPayload, { imageId: '12345' }) as Request;
    const res: Response = imagesMockResponse();
    jest.spyOn(imageServer.socketIOImageObject, 'emit');
    jest.spyOn(imageQueue, 'addImageJob');

    await Delete.prototype.image(req, res);
    expect(imageServer.socketIOImageObject.emit).toHaveBeenCalledWith('delete image', req.params.imageId);
    expect(imageQueue.addImageJob).toHaveBeenCalledWith('removeImageFromDB', { imageId: req.params.imageId });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Image deleted successfully'
    });
  });

  it('should send correct json response for background image upload', async () => {
    const req: Request = imagesMockRequest({}, {}, authUserPayload, { bgImageId: '12345' }) as Request;
    const res: Response = imagesMockResponse();
    jest.spyOn(imageServer.socketIOImageObject, 'emit');
    jest.spyOn(imageQueue, 'addImageJob');
    jest.spyOn(imageService, 'getImageByBackgroundId').mockResolvedValue(fileDocumentMock);
    jest.spyOn(UserCache.prototype, 'updateSingleUserItemInCache');

    await Delete.prototype.backgroundImage(req, res);
    expect(imageServer.socketIOImageObject.emit).toHaveBeenCalledWith('delete image', req.params.imageId);
    expect(imageQueue.addImageJob).toHaveBeenCalledWith('removeImageFromDB', { imageId: req.params.imageId });
    expect(UserCache.prototype.updateSingleUserItemInCache).toHaveBeenCalledWith(`${req.currentUser?.userId}`, 'bgImageVersion', '');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Image deleted successfully'
    });
  });
});
