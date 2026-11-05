// Bound decoded images and output canvases across all open tool sessions.
interface Waiter {
  signal: AbortSignal;
  enter: () => void;
  cancel: () => void;
}
let occupied = false;
const queue: Waiter[] = [];
function advance() {
  const next = queue.shift();
  if (next) next.enter();
  else occupied = false;
}
export async function withRenderSlot<T>(
  signal: AbortSignal,
  work: () => Promise<T>,
): Promise<T> {
  signal.throwIfAborted();
  await new Promise<void>((resolve, reject) => {
    const enter = () => {
      signal.removeEventListener('abort', cancel);
      occupied = true;
      resolve();
    };
    const cancel = () => {
      const index = queue.indexOf(waiter);
      if (index >= 0) queue.splice(index, 1);
      reject(signal.reason);
    };
    const waiter = { signal, enter, cancel };
    if (!occupied) enter();
    else {
      queue.push(waiter);
      signal.addEventListener('abort', cancel, { once: true });
    }
  });
  try {
    signal.throwIfAborted();
    return await work();
  } finally {
    advance();
  }
}
