(() => {
  const canvas = document.getElementById("starfield");
  const context = canvas.getContext("2d", { alpha: true });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stars = [];
  const palette = [
    { core: "#ffffff", mid: "#c6e0ff", edge: "#568eff", tail: "rgba(113, 167, 255, .45)" },
    { core: "#ffffff", mid: "#d5c9ff", edge: "#8970f5", tail: "rgba(157, 136, 255, .42)" },
    { core: "#ffffff", mid: "#bff3ff", edge: "#35b6df", tail: "rgba(88, 218, 255, .4)" },
    { core: "#ffffff", mid: "#ffd6ef", edge: "#d37db5", tail: "rgba(225, 137, 193, .4)" },
  ];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let targetCount = 0;
  let activeStar = null;
  let pointer = { x: 0, y: 0, lastX: 0, lastY: 0, lastTime: 0 };
  let animationFrame = 0;

  function makeStar(randomY = true) {
    const radius = 1.9 + Math.random() * 1.6;
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -10,
      radius,
      speed: 0.65 + Math.random() * 0.55,
      drift: (Math.random() - 0.5) * 0.2,
      vx: 0,
      vy: 0,
      trail: [],
      launched: false,
      ambientMover: stars.filter((star) => star.ambientMover && !star.launched && !star.held).length < 7,
      phase: Math.random() * Math.PI * 2,
      colors: palette[Math.floor(Math.random() * palette.length)],
      held: false,
    };
  }

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    targetCount = Math.min(55, Math.max(32, Math.round((width * height) / 16000)));
    while (stars.length < targetCount) stars.push(makeStar());
    while (stars.length > targetCount) stars.pop();
    ensureAmbientMovers();
  }

  function ensureAmbientMovers() {
    let movingCount = stars.filter((star) => star.ambientMover && !star.launched && !star.held).length;
    for (const star of stars) {
      if (movingCount >= 7) break;
      if (!star.ambientMover && !star.launched && !star.held) {
        star.ambientMover = true;
        movingCount += 1;
      }
    }
    while (movingCount < 7) {
      const star = makeStar(false);
      star.ambientMover = true;
      stars.push(star);
      movingCount += 1;
    }
  }

  function drawStar(star, time) {
    const twinkle = reducedMotion.matches ? 0.85 : 0.7 + Math.sin(time * 0.0012 + star.phase) * 0.28;
    const r = star.radius;
    context.save();
    context.globalAlpha = twinkle;
    context.shadowColor = star.colors.edge;
    context.shadowBlur = star.held ? 30 : 17;
    const visibleTrail = star.launched || star.held ? star.trail : star.trail.slice(0, 4);
    if (visibleTrail.length > 1) {
      const tail = visibleTrail[visibleTrail.length - 1];
      const trailGradient = context.createLinearGradient(star.x, star.y, tail.x, tail.y);
      trailGradient.addColorStop(0, star.colors.tail);
      trailGradient.addColorStop(1, "rgba(130, 170, 255, 0)");
      context.beginPath();
      context.moveTo(star.x, star.y);
      for (let i = 0; i < visibleTrail.length; i += 1) {
        context.lineTo(visibleTrail[i].x, visibleTrail[i].y);
      }
      context.strokeStyle = star.held ? star.colors.tail : trailGradient;
      context.lineWidth = star.held ? r * 1.2 : star.launched ? r * 0.85 : r * 0.45;
      context.lineCap = "round";
      context.stroke();
    }
    const starGradient = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, r * 1.8);
    starGradient.addColorStop(0, star.colors.core);
    starGradient.addColorStop(0.35, star.colors.mid);
    starGradient.addColorStop(1, star.colors.edge);
    context.fillStyle = starGradient;
    context.beginPath();
    context.moveTo(star.x, star.y - r * 1.5);
    context.lineTo(star.x + r * 0.55, star.y - r * 0.45);
    context.lineTo(star.x + r * 1.5, star.y);
    context.lineTo(star.x + r * 0.45, star.y + r * 0.55);
    context.lineTo(star.x, star.y + r * 1.5);
    context.lineTo(star.x - r * 0.45, star.y + r * 0.55);
    context.lineTo(star.x - r * 1.5, star.y);
    context.lineTo(star.x - r * 0.55, star.y - r * 0.45);
    context.closePath();
    context.fill();
    context.restore();
  }

  function resolveCollisions() {
    for (let i = 0; i < stars.length; i += 1) {
      const first = stars[i];
      if (first.held) continue;
      for (let j = i + 1; j < stars.length; j += 1) {
        const second = stars[j];
        if (second.held) continue;

        const firstMoves = first.launched || first.ambientMover;
        const secondMoves = second.launched || second.ambientMover;
        if (!firstMoves && !secondMoves) continue;

        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const distance = Math.hypot(dx, dy);
        const minDistance = (first.radius + second.radius) * 1.6;
        if (distance === 0 || distance >= minDistance) continue;

        const nx = dx / distance;
        const ny = dy / distance;
        const overlap = minDistance - distance;
        if (firstMoves && secondMoves) {
          first.x -= nx * overlap * 0.5;
          first.y -= ny * overlap * 0.5;
          second.x += nx * overlap * 0.5;
          second.y += ny * overlap * 0.5;
        } else if (firstMoves) {
          first.x -= nx * overlap;
          first.y -= ny * overlap;
        } else {
          second.x += nx * overlap;
          second.y += ny * overlap;
        }
        if (firstMoves) first.trail.length = 0;
        if (secondMoves) second.trail.length = 0;

        const firstVx = first.launched ? first.vx : firstMoves ? first.drift : 0;
        const firstVy = first.launched ? first.vy : firstMoves ? first.speed : 0;
        const secondVx = second.launched ? second.vx : secondMoves ? second.drift : 0;
        const secondVy = second.launched ? second.vy : secondMoves ? second.speed : 0;
        const closingSpeed = (firstVx - secondVx) * nx + (firstVy - secondVy) * ny;
        if (closingSpeed <= 0) continue;

        const impulse = firstMoves && secondMoves ? closingSpeed : closingSpeed * 2;
        const deflection = first.phase < second.phase ? -0.75 : 0.75;
        if (firstMoves) {
          const vx = firstVx - impulse * nx;
          const vy = firstVy - impulse * ny;
          if (first.launched) {
            first.vx = vx;
            first.vy = vy;
          } else {
            first.drift = Math.max(-0.8, Math.min(0.8, first.drift + deflection));
          }
        }
        if (secondMoves) {
          const vx = secondVx + impulse * nx;
          const vy = secondVy + impulse * ny;
          if (second.launched) {
            second.vx = vx;
            second.vy = vy;
          } else {
            second.drift = Math.max(-0.8, Math.min(0.8, second.drift - deflection));
          }
        }
      }
    }
  }

  function frame(time) {
    context.clearRect(0, 0, width, height);
    for (let i = stars.length - 1; i >= 0; i -= 1) {
      const star = stars[i];
      if (star.held) {
        star.x = pointer.x;
        star.y = pointer.y;
      } else if (star.launched) {
        star.x += star.vx;
        star.y += star.vy;
        star.vx *= 0.999;
        star.vy *= 0.999;
        if (star.x < -24 || star.x > width + 24 || star.y < -24 || star.y > height + 24) {
          stars.splice(i, 1);
          continue;
        }
      } else if (star.ambientMover) {
        // Keep the ambient field moving even when the OS requests reduced motion.
        // Dragging and throwing stars remains available; twinkle is already reduced above.
        const motionScale = reducedMotion.matches ? 0.55 : 1;
        star.x += (star.drift + Math.sin(time * 0.00045 + star.phase) * 0.045) * motionScale;
        star.y += (star.speed + Math.sin(time * 0.00065 + star.phase) * 0.035) * motionScale;
        if (star.y > height + 24) {
          star.y = -24;
          star.x = Math.random() * width;
          star.trail.length = 0;
        }
        if (star.x < -24) star.x = width + 24;
        if (star.x > width + 24) star.x = -24;
      }
      if (star.trail.length === 0 || Math.hypot(star.x - star.trail[0].x, star.y - star.trail[0].y) > 2) {
        star.trail.unshift({ x: star.x, y: star.y });
        if (star.trail.length > 10) star.trail.pop();
      }
      drawStar(star, time);
    }
    resolveCollisions();
    while (stars.length < targetCount) stars.push(makeStar());
    ensureAmbientMovers();
    animationFrame = window.requestAnimationFrame(frame);
  }

  function localPoint(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.pointerType !== "touch") return;
    if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select")) return;
    const { x, y } = localPoint(event);
    let nearest = null;
    let nearestDistance = 38;
    for (const star of stars) {
      const distance = Math.hypot(star.x - x, star.y - y);
      if (distance < nearestDistance) {
        nearest = star;
        nearestDistance = distance;
      }
    }
    if (!nearest) return;
    activeStar = nearest;
    activeStar.held = true;
    activeStar.ambientMover = false;
    pointer = { x, y, lastX: x, lastY: y, lastTime: performance.now() };
    if (event.pointerType === "touch") event.preventDefault();
  }

  function onPointerMove(event) {
    if (!activeStar) return;
    const now = performance.now();
    const { x, y } = localPoint(event);
    const elapsed = Math.max(8, now - pointer.lastTime);
    pointer.x = x;
    pointer.y = y;
    activeStar.vx = Math.max(-9, Math.min(9, ((x - pointer.lastX) / elapsed) * 16 * 0.38));
    activeStar.vy = Math.max(-9, Math.min(9, ((y - pointer.lastY) / elapsed) * 16 * 0.38));
    pointer.lastX = x;
    pointer.lastY = y;
    pointer.lastTime = now;
    event.preventDefault();
  }

  function onPointerUp() {
    if (!activeStar) return;
    activeStar.held = false;
    activeStar.launched = Math.hypot(activeStar.vx, activeStar.vy) > 0.5;
    if (!activeStar.launched) {
      activeStar.vx = 0;
      activeStar.vy = 0;
      activeStar.trail.length = 0;
    }
    activeStar = null;
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  reducedMotion.addEventListener?.("change", () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(frame);
  });
  animationFrame = window.requestAnimationFrame(frame);
})();
