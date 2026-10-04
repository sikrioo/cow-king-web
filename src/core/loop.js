// 고정 타임스텝 루프 (물리 안정성을 위해 dt를 항상 1/60으로 고정)
export const STEP_MS = 1000 / 60;

export function startLoop(fixedUpdate, render) {
  let accumulator = 0;
  let lastTime = performance.now();

  function loop(now) {
    let frameTime = now - lastTime;
    lastTime = now;
    if (frameTime > 250) frameTime = 250;
    accumulator += frameTime;

    while (accumulator >= STEP_MS) {
      fixedUpdate(STEP_MS / 1000);
      accumulator -= STEP_MS;
    }

    render(now / 1000);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
