export function createTimer({ durationSeconds, onTick, onComplete } = {}) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError("durationSeconds must be greater than zero.");
  }

  const durationMilliseconds = durationSeconds * 1000;
  let animationFrameId = null;
  let elapsedMilliseconds = 0;
  let startedAt = null;
  let isRunning = false;

  function start() {
    if (isRunning || isComplete()) {
      return;
    }

    isRunning = true;
    startedAt = performance.now() - elapsedMilliseconds;
    notifyTick();
    animationFrameId = requestAnimationFrame(animate);
  }

  function pause() {
    if (!isRunning) {
      return;
    }

    elapsedMilliseconds = Math.min(
      performance.now() - startedAt,
      durationMilliseconds,
    );
    isRunning = false;
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    notifyTick();
  }

  function reset() {
    pause();
    elapsedMilliseconds = 0;
    startedAt = null;
    notifyTick();
  }

  function destroy() {
    pause();
  }

  function getState() {
    const remainingMilliseconds = Math.max(
      durationMilliseconds - elapsedMilliseconds,
      0,
    );

    return {
      durationMilliseconds,
      elapsedMilliseconds,
      remainingMilliseconds,
      remainingSeconds: Math.ceil(remainingMilliseconds / 1000),
      isComplete: isComplete(),
      isRunning,
    };
  }

  function animate(now) {
    elapsedMilliseconds = Math.min(now - startedAt, durationMilliseconds);
    notifyTick();

    if (isComplete()) {
      isRunning = false;
      animationFrameId = null;
      onComplete?.(getState());
      return;
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  function notifyTick() {
    onTick?.(getState());
  }

  function isComplete() {
    return elapsedMilliseconds >= durationMilliseconds;
  }

  return { destroy, getState, pause, reset, start };
}
