import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { QueuesController } from './queues.controller';

const createQueueMock = (counts: { active: number; waiting: number; failed: number }) =>
  ({
    getJobCounts: jest.fn().mockResolvedValue(counts),
  }) as Pick<Queue, 'getJobCounts'>;

describe('QueuesController', () => {
  it('aggregates job counts across queues', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [QueuesController],
      providers: [
        {
          provide: getQueueToken('content-generation'),
          useValue: createQueueMock({ active: 1, waiting: 2, failed: 3 }),
        },
        {
          provide: getQueueToken('lora-training'),
          useValue: createQueueMock({ active: 4, waiting: 5, failed: 6 }),
        },
        {
          provide: getQueueToken('video-generation'),
          useValue: createQueueMock({ active: 7, waiting: 8, failed: 9 }),
        },
      ],
    }).compile();

    const controller = moduleRef.get(QueuesController);

    const result = await controller.summary();

    expect(result).toEqual({ active: 12, waiting: 15, failed: 18 });
  });
});
