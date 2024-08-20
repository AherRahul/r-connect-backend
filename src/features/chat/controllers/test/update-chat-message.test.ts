import { Request, Response } from 'express';
import { authUserPayload } from '../../../../mocks/auth.mock';
import { Update } from '../../controllers/update-chat-message';
import { Server } from 'socket.io';
import * as chatServer from '../../../../shared/scokets/chat';
import { chatMockRequest, chatMockResponse } from '../../../../mocks/chat.mock';
import { existingUser } from '../../../../mocks/user.mock';
import { MessageCache } from '../../../../shared/services/redis/message.cache';
import { chatQueue } from '../../../../shared/services/queues/chat.queue';
import { messageDataMock } from '../../../../mocks/chat.mock';

jest.useFakeTimers();
jest.mock('../../../../shared/services/queues/base.queue');
jest.mock('../../../../shared/services/redis/message.cache');

Object.defineProperties(chatServer, {
  socketIOChatObject: {
    value: new Server(),
    writable: true
  }
});

describe('Update', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('message', () => {
    it('should send correct json response from redis cache', async () => {
      const req: Request = chatMockRequest(
        {},
        {
          senderId: `${existingUser._id}`,
          receiverId: '60263f14648fed5246e322d8'
        },
        authUserPayload
      ) as Request;
      const res: Response = chatMockResponse();
      jest.spyOn(MessageCache.prototype, 'updateChatMessages').mockResolvedValue(messageDataMock);
      jest.spyOn(chatServer.socketIOChatObject, 'emit');

      await Update.prototype.message(req, res);
      expect(chatServer.socketIOChatObject.emit).toHaveBeenCalledTimes(2);
      expect(chatServer.socketIOChatObject.emit).toHaveBeenCalledWith('message read', messageDataMock);
      expect(chatServer.socketIOChatObject.emit).toHaveBeenCalledWith('chat list', messageDataMock);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Message marked as read'
      });
    });

    it('should call chatQueue addChatJob', async () => {
      const req: Request = chatMockRequest(
        {},
        {
          senderId: `${existingUser._id}`,
          receiverId: '60263f14648fed5246e322d8'
        },
        authUserPayload
      ) as Request;
      const res: Response = chatMockResponse();
      jest.spyOn(MessageCache.prototype, 'updateChatMessages').mockResolvedValue(messageDataMock);
      jest.spyOn(chatQueue, 'addChatJob');

      await Update.prototype.message(req, res);
      expect(chatQueue.addChatJob).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Message marked as read'
      });
    });
  });
});
