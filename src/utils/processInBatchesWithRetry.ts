// utils/processInBatchesWithRetry.ts
import { chunkArray } from './chungArray';
import { sleep } from './sleep';

interface ProcessOptions<TInput, TResult> {
  inputs: TInput[];
  batchSize: number;
  concurrency: number;
  handler: (input: TInput, retry: number) => Promise<TResult>;
  retryLimit?: number;
  onRetryDelay?: (retry: number, error: any) => number | Promise<number>; // tuỳ chỉnh delay khi retry
}

export async function processInBatchesWithRetry<TInput, TResult>({
  inputs,
  batchSize,
  concurrency,
  handler,
  retryLimit = 3,
  onRetryDelay = (retry, error) => error?.response?.status === 429 ? 2000 * (retry + 1) : 1000,
}: ProcessOptions<TInput, TResult>): Promise<TResult[]> {
  const batches = chunkArray(inputs, batchSize);
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(concurrency);

  const results: TResult[] = [];

  const tasks = batches.map((batch:any) =>
    limit(async () => {
      for (const input of batch) {
        let retry = 0;
        while (true) {
          try {
            const result = await handler(input, retry);
            results.push(result);
            break;
          } catch (error) {
            retry++;
            if (retry > retryLimit) {
              throw error;
            }
            const delay = await onRetryDelay(retry, error);
            await sleep(delay);
          }
        }
      }
    })
  );

  await Promise.all(tasks);

  return results;
}
