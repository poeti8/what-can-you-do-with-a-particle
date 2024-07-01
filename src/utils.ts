// map between two range of numbers
function map(value: number, x1: number, y1: number, x2: number, y2: number) {
  return ((value - x1) * (y2 - x2)) / (y1 - x1) + x2;
};

// linear interpolation between two numbers
function lerp(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
};

// asynchronous wait
function wait(milliseconds: number) {
  return new Promise(r => setTimeout(r, milliseconds));
}

// display particles count on the screen
function showParticleCount(count: number) {
  document.querySelector(".count")!.textContent = parseInt(count.toString()).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export {
  showParticleCount,
  lerp,
  map,
  wait,
}