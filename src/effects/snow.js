// Falling-snow background drawn on the full-page canvas. Returns a cleanup function.
export function startSnow(canvas) {
  const ctx = canvas.getContext('2d');
  let animId;

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const handleResize = () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', handleResize);

  const flakeCount = Math.floor(Math.min(width, 1400) * 0.055);
  const flakes = [];

  for (let i = 0; i < flakeCount; i++) {
    flakes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.6 + 0.35,
      swayOffset: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.55 + 0.25
    });
  }

  let angle = 0;
  const render = () => {
    ctx.clearRect(0, 0, width, height);
    angle += 0.008;

    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      f.y += f.speedY;
      f.x += Math.sin(angle + f.swayOffset) * 0.55;

      if (f.y > height + 5) {
        f.y = -5;
        f.x = Math.random() * width;
      }
      if (f.x > width + 5) f.x = -5;
      else if (f.x < -5) f.x = width + 5;

      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2, false);
      ctx.fillStyle = `rgba(224, 242, 254, ${f.opacity})`;
      ctx.shadowBlur = 4;
      ctx.shadowColor = 'rgba(186, 230, 253, 0.4)';
      ctx.fill();
    }

    animId = requestAnimationFrame(render);
  };

  render();

  return () => {
    window.removeEventListener('resize', handleResize);
    cancelAnimationFrame(animId);
  };
}
