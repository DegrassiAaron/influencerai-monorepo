import { Test } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';

const queueMock = { add: jest.fn().mockResolvedValue(null) } as Pick<Queue, 'add'>;

describe('JobsService', () => {
  it('creates job and enqueues', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: { job: { create: jest.fn().mockResolvedValue({ id: 'j1', type: 'content-generation' }) } } },
        { provide: 'BullQueue_content-generation', useValue: queueMock },
        { provide: 'BullQueue_lora-training', useValue: queueMock },
        { provide: 'BullQueue_video-generation', useValue: queueMock },
      ],
    }).compile();

    const svc = moduleRef.get(JobsService);
    const job = await svc.createJob({ type: 'content-generation', payload: { foo: 'bar' } });

    expect(job.id).toBe('j1');
    expect(queueMock.add).toHaveBeenCalledWith('content-generation', expect.objectContaining({ jobId: 'j1', foo: 'bar' }), expect.any(Object));
  });
});
