(() => {
  const canvas = document.getElementById("starfield");
  const context = canvas.getContext("2d", { alpha: true });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // ---- Settings you can tweak -------------------------------------------
  const settings = {
    maxFalling: 3,          // most falling stars on screen at once (desktop)
    maxFallingSmall: 2,     // same, for screens narrower than 700px
    fallingGapMin: 2200,    // shortest wait (ms) before the next falling star
    fallingGapMax: 6000,    // longest wait (ms)
    fallingSpeedMin: 3.2,   // pixels per frame at 60fps
    fallingSpeedMax: 5.4,
    fallingTrail: 26,       // length of a falling star's tail (points)
    collisionScale: 3,      // how "big" a star is when bumping (x its radius)
    bounciness: 0.9,        // 1 = perfectly bouncy, 0 = no bounce
  };
  // -----------------------------------------------------------------------

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
  let lastFrameTime = 0;
  let nextFallingAt = 1500 + Math.random() * 1500;

  function pickColors() {
    return palette[Math.floor(Math.random() * palette.length)];
  }

  // Background star that drifts slowly down the page.
  function makeStar(randomY = true) {
    const radius = 1.9 + Math.random() * 1.6;
    const baseVy = 0.18 + Math.random() * 0.32;
    const baseVx = (Math.random() - 0.5) * 0.2;
    return {
      kind: "ambient",
      thrown: false,
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -10,
      radius,
      baseVx,
      baseVy,
      vx: baseVx,
      vy: baseVy,
      trail: [],
      trailMax: 10,
      flash: 0,
      phase: Math.random() * Math.PI * 2,
      colors: pickColors(),
      held: false,
    };
  }

  function maxFalling() {
    return width < 700 ? settings.maxFallingSmall : settings.maxFalling;
  }

  function countKind(kind) {
    let count = 0;
    for (const star of stars) if (star.kind === kind) count += 1;
    return count;
  }

  // Fast star that streaks diagonally from the top of the screen to the bottom.
  function spawnFalling() {
    const direction = Math.random() < 0.5 ? -1 : 1;
    const angle = (12 + Math.random() * 23) * (Math.PI / 180); // tilt from vertical
    const speed = settings.fallingSpeedMin + Math.random() * (settings.fallingSpeedMax - settings.fallingSpeedMin);
    const baseVx = Math.sin(angle) * speed * direction;
    const baseVy = Math.cos(angle) * speed;
    // Start far from other falling stars that have just entered, and away from the side it drifts toward.
    let x = 0;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      x = direction > 0 ? Math.random() * width * 0.75 : width * 0.25 + Math.random() * width * 0.75;
      const crowded = stars.some((s) => s.kind === "falling" && s.y < 260 && Math.abs(s.x - x) < 220);
      if (!crowded) break;
    }
    stars.push({
      kind: "falling",
      thrown: false,
      x,
      y: -20,
      radius: 2.3 + Math.random() * 1,
      baseVx,
      baseVy,
      vx: baseVx,
      vy: baseVy,
      trail: [],
      trailMax: settings.fallingTrail,
      flash: 0,
      phase: Math.random() * Math.PI * 2,
      colors: pickColors(),
      held: false,
    });
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
    let ambient = countKind("ambient");
    while (ambient < targetCount) {
      stars.push(makeStar());
      ambient += 1;
    }
    for (let i = stars.length - 1; i >= 0 && ambient > targetCount; i -= 1) {
      if (stars[i].kind === "ambient" && stars[i] !== activeStar) {
        stars.splice(i, 1);
        ambient -= 1;
      }
    }
  }

  // Elastic bounce between two stars. A star being dragged acts like an immovable wall.
  function collide(a, b) {
    if (a.held && b.held) return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const minDist = (a.radius + b.radius) * settings.collisionScale;
    const distSq = dx * dx + dy * dy;
    if (distSq >= minDist * minDist) return;

    let dist = Math.sqrt(distSq);
    let nx;
    let ny;
    if (dist < 0.0001) {
      const angle = Math.random() * Math.PI * 2;
      nx = Math.cos(angle);
      ny = Math.sin(angle);
      dist = 0;
    } else {
      nx = dx / dist;
      ny = dy / dist;
    }

    const massA = a.radius * a.radius;
    const massB = b.radius * b.radius;
    const invA = a.held ? 0 : 1 / massA;
    const invB = b.held ? 0 : 1 / massB;
    const invSum = invA + invB;

    // Push the stars apart so they don't stay overlapped.
    const overlap = minDist - dist;
    a.x -= nx * overlap * (invA / invSum);
    a.y -= ny * overlap * (invA / invSum);
    b.x += nx * overlap * (invB / invSum);
    b.y += ny * overlap * (invB / invSum);

    // Exchange momentum along the line between the two stars.
    const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (approach >= 0) return; // already moving apart
    const impulse = (-(1 + settings.bounciness) * approach) / invSum;
    a.vx -= impulse * invA * nx;
    a.vy -= impulse * invA * ny;
    b.vx += impulse * invB * nx;
    b.vy += impulse * invB * ny;

    if (-approach > 0.25) {
      a.flash = Math.min(1, Math.max(a.flash, -approach / 3));
      b.flash = Math.min(1, Math.max(b.flash, -approach / 3));
    }
  }

  function drawStar(star, time) {
    const falling = star.kind === "falling";
    const baseTwinkle = reducedMotion.matches ? 0.85 : 0.7 + Math.sin(time * 0.0012 + star.phase) * 0.28;
    const twinkle = Math.min(1, (falling ? 1 : baseTwinkle) + star.flash * 0.3);
    const r = star.radius * (1 + star.flash * 0.35);
    context.save();
    context.globalAlpha = twinkle;
    context.shadowColor = star.colors.edge;
    context.shadowBlur = (star.held ? 30 : falling ? 22 : 17) + star.flash * 18;
    if (star.trail.length > 1) {
      const tail = star.trail[star.trail.length - 1];
      const trailGradient = context.createLinearGradient(star.x, star.y, tail.x, tail.y);
      trailGradient.addColorStop(0, star.colors.tail);
      trailGradient.addColorStop(1, "rgba(130, 170, 255, 0)");
      context.beginPath();
      context.moveTo(star.x, star.y);
      for (let i = 0; i < star.trail.length; i += 1) {
        context.lineTo(star.trail[i].x, star.trail[i].y);
      }
      context.strokeStyle = star.held ? star.colors.tail : trailGradient;
      context.lineWidth = star.held ? r * 1.2 : falling ? r * 1.05 : r * 0.85;
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

  function isOffscreen(star) {
    if (star.thrown) {
      return star.x < -24 || star.x > width + 24 || star.y < -24 || star.y > height + 24;
    }
    // Falling stars that aren't thrown: leave once they pass the bottom or wander well off the sides.
    return star.y > height + 24 || star.y < -120 || star.x < -60 || star.x > width + 60;
  }

  function frame(time) {
    const dt = lastFrameTime ? Math.min((time - lastFrameTime) / 16.667, 3) : 1;
    lastFrameTime = time;
    const reduced = reducedMotion.matches;

    // Occasionally launch a new falling star, keeping only a few on screen.
    if (!reduced && time >= nextFallingAt) {
      if (countKind("falling") < maxFalling()) spawnFalling();
      nextFallingAt = time + settings.fallingGapMin + Math.random() * (settings.fallingGapMax - settings.fallingGapMin);
    }

    context.clearRect(0, 0, width, height);

    // 1. Move every star.
    for (let i = stars.length - 1; i >= 0; i -= 1) {
      const star = stars[i];
      star.flash *= Math.pow(0.93, dt);
      if (star.held) {
        star.x = pointer.x;
        star.y = pointer.y;
        continue;
      }
      if (star.kind === "falling" && !star.thrown && reduced) {
        stars.splice(i, 1);
        continue;
      }
      if (star.thrown) {
        const damping = Math.pow(0.999, dt);
        star.vx *= damping;
        star.vy *= damping;
      } else {
        // After a bump, ease back toward the star's natural drift or fall.
        const ease = 1 - Math.pow(0.985, dt);
        star.vx += (star.baseVx - star.vx) * ease;
        star.vy += (star.baseVy - star.vy) * ease;
      }
      if (star.thrown || !reduced) {
        let wobbleX = 0;
        let wobbleY = 0;
        if (star.kind === "ambient" && !star.thrown) {
          wobbleX = Math.sin(time * 0.00045 + star.phase) * 0.045;
          wobbleY = Math.sin(time * 0.00065 + star.phase) * 0.035;
        }
        star.x += (star.vx + wobbleX) * dt;
        star.y += (star.vy + wobbleY) * dt;
      }
      if (star.thrown || star.kind === "falling") {
        if (isOffscreen(star)) {
          stars.splice(i, 1);
          continue;
        }
      } else {
        // Background stars wrap around the edges.
        if (star.y > height + 24) {
          star.y = -24;
          star.x = Math.random() * width;
          star.trail.length = 0;
        } else if (star.y < -48) {
          star.y = height + 24;
          star.trail.length = 0;
        }
        if (star.x < -24) {
          star.x = width + 24;
          star.trail.length = 0;
        } else if (star.x > width + 24) {
          star.x = -24;
          star.trail.length = 0;
        }
      }
    }

    // 2. Collisions between every pair of stars.
    for (let i = 0; i < stars.length; i += 1) {
      for (let j = i + 1; j < stars.length; j += 1) {
        collide(stars[i], stars[j]);
      }
    }

    // 3. Update tails and draw.
    for (const star of stars) {
      if (star.trail.length === 0 || Math.hypot(star.x - star.trail[0].x, star.y - star.trail[0].y) > 2) {
        star.trail.unshift({ x: star.x, y: star.y });
        if (star.trail.length > star.trailMax) star.trail.pop();
      }
      drawStar(star, time);
    }

    // Replace background stars that were thrown off the screen.
    let ambient = countKind("ambient");
    while (ambient < targetCount) {
      stars.push(makeStar(false));
      ambient += 1;
    }
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
    activeStar.thrown = false;
    activeStar.vx = 0;
    activeStar.vy = 0;
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
    const star = activeStar;
    star.held = false;
    // If the pointer paused before release, it isn't a throw.
    if (performance.now() - pointer.lastTime > 80) {
      star.vx = 0;
      star.vy = 0;
    }
    star.thrown = Math.hypot(star.vx, star.vy) > 0.5;
    if (!star.thrown) {
      star.vx = star.baseVx;
      star.vy = star.baseVy;
      star.trail.length = 0;
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
