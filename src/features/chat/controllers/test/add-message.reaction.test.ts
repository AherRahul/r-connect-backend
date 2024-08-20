import { Request, Response } from 'express';
import { authUserPayload } from '../../../../mocks/auth.mock';
import { Server } from 'socket.io';
import * as chatServer from '../../../../shared/scokets/chat';
import { chatMockRequest, chatMockResponse, mockMessageId } from '../../../../mocks/chat.mock';
import { MessageCache } from '../../../../shared/services/redis/message.cache';
import { chatQueue } from '../../../../shared/services/queues/chat.queue';
import { messageDataMock } from '../../../../mocks/chat.mock';
import { Message } from '../../controllers/add-message-reaction';

jest.useFakeTimers();
jest.mock('../../../../shared/services/queues/base.queue');
jest.mock('../../../../shared/services/redis/message.cache');

Object.defineProperties(chatServer, {
  socketIOChatObject: {
    value: new Server(),
    writable: true
  }
});

describe('Message', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('message', () => {
    it('should call updateMessageReaction', async () => {
      const req: Request = chatMockRequest(
        {},
        {
          conversationId: '602854c81c9ca7939aaeba43',
          messageId: `${mockMessageId}`,
          reaction: 'love',
          type: 'add'
        },
        authUserPayload
      ) as Request;
      const res: Response = chatMockResponse();
      jest.spyOn(MessageCache.prototype, 'updateMessageReaction').mockResolvedValue(messageDataMock);
      jest.spyOn(chatServer.socketIOChatObject, 'emit');

      await Message.prototype.reaction(req, res);
      expect(MessageCache.prototype.updateMessageReaction).toHaveBeenCalledWith(
        '602854c81c9ca7939aaeba43',
        `${mockMessageId}`,
        'love',
        `${authUserPayload.username}`,
        'add'
      );
      expect(chatServer.socketIOChatObject.emit).toHaveBeenCalledTimes(1);
      expect(chatServer.socketIOChatObject.emit).toHaveBeenCalledWith('message reaction', messageDataMock);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Message reaction added'
      });
    });

    it('should call chatQueue addChatJob', async () => {
      const req: Request = chatMockRequest(
        {},
        {
          conversationId: '602854c81c9ca7939aaeba43',
          messageId: `${mockMessageId}`,
          reaction: 'love',
          type: 'add'
        },
        authUserPayload
      ) as Request;
      const res: Response = chatMockResponse();
      jest.spyOn(chatQueue, 'addChatJob');

      await Message.prototype.reaction(req, res);
      expect(chatQueue.addChatJob).toHaveBeenCalledWith('updateMessageReaction', {
        messageId: mockMessageId,
        senderName: req.currentUser!.username,
        reaction: 'love',
        type: 'add'
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Message reaction added'
      });
    });
  });
});
