(() => {
  const canvas = document.getElementById("constellation-field");
  if (!canvas) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  // This decorative layer shares a budget with the catchable stars below:
  // 88 + at most 62 on desktop, and 29 + at most 31 on mobile.
  const MAX_PARTICLES = 88;
  let activeParticleCount = MAX_PARTICLES;
  const FORMATION_MS = 90000;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const groups = [
    {
      center: [0.2, 0.3], color: [56, 189, 248],
      points: [[-1, 0], [-.45, -.65], [.2, -.8], [.85, -.35], [.75, .4], [.05, .75], [-.7, .5]],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 6], [6, 5]],
    },
    {
      center: [0.72, 0.28], color: [167, 139, 250],
      points: [[-1, -.45], [-.35, -.8], [.35, -.6], [.95, -.05], [.55, .65], [-.2, .85], [-.75, .35]],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [2, 5]],
    },
    {
      center: [0.49, 0.72], color: [125, 211, 252],
      points: [[-1, -.1], [-.5, -.8], [.1, -.55], [.85, -.7], [.55, .05], [.95, .7], [.1, .8], [-.55, .55]],
      links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [2, 4]],
    },
  ];
  const nodeTargets = [];
  const edges = [];
  groups.forEach((group, groupIndex) => {
    const firstNode = nodeTargets.length;
    group.points.forEach(([x, y]) => nodeTargets.push({ groupIndex, x, y }));
    group.links.forEach(([from, to]) => edges.push({ from: firstNode + from, to: firstNode + to, groupIndex }));
  });

  const particles = Array.from({ length: MAX_PARTICLES }, (_, index) => ({
    phase: Math.random() * Math.PI * 2,
    radius: index < nodeTargets.length ? 1 + Math.random() * .45 : .45 + Math.random() * .55,
    target: index < nodeTargets.length ? nodeTargets[index] : null,
    startX: 0,
    startY: 0,
    targetX: 0,
    targetY: 0,
  }));
  const positions = Array.from({ length: MAX_PARTICLES }, () => ({ x: 0, y: 0 }));
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let activeTime = 0;
  let previousFrame = 0;
  let animationFrame = 0;
  let running = false;

  function resize() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    activeParticleCount = width <= 640 ? 29 : MAX_PARTICLES;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const scale = Math.min(width, height) * .105;
    particles.forEach((particle) => {
      particle.startX = Math.random() * width;
      particle.startY = Math.random() * height;
      if (particle.target) {
        const group = groups[particle.target.groupIndex];
        particle.targetX = Math.max(20, Math.min(width - 20, group.center[0] * width + particle.target.x * scale));
        particle.targetY = Math.max(20, Math.min(height - 20, group.center[1] * height + particle.target.y * scale));
      }
    });
    draw();
  }

  function draw() {
    context.clearRect(0, 0, width, height);
    const progress = reducedMotion.matches ? 1 : Math.min(activeTime / FORMATION_MS, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const driftAmount = 13 * (1 - eased * .72);

    for (let index = 0; index < activeParticleCount; index += 1) {
      const particle = particles[index];
      const t = activeTime * .00018 + particle.phase;
      const target = particle.target;
      positions[index].x = target
        ? particle.startX + (particle.targetX - particle.startX) * eased + Math.sin(t) * driftAmount * .4
        : particle.startX + Math.sin(t) * driftAmount;
      positions[index].y = target
        ? particle.startY + (particle.targetY - particle.startY) * eased + Math.cos(t * .83) * driftAmount * .4
        : particle.startY + Math.cos(t * .83) * driftAmount;
    }

    if (progress > .025) {
      groups.forEach((group, groupIndex) => {
        context.beginPath();
        edges.forEach((edge) => {
          if (edge.groupIndex !== groupIndex) return;
          const from = positions[edge.from];
          const to = positions[edge.to];
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
        });
        context.strokeStyle = `rgba(${group.color.join(",")},${.16 * eased})`;
        context.lineWidth = .7;
        context.stroke();
      });
    }

    for (let index = 0; index < activeParticleCount; index += 1) {
      const particle = particles[index];
      const position = positions[index];
      const twinkle = .55 + (Math.sin(activeTime * .001 + particle.phase) + 1) * .16;
      context.globalAlpha = particle.target ? twinkle * (.28 + eased * .52) : twinkle * .35;
      context.beginPath();
      context.arc(position.x, position.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = particle.target
        ? (particle.target.groupIndex === 1 ? "#ddd2ff" : "#d8f5ff")
        : "#c8d8f5";
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function frame(now) {
    if (!running) return;
    if (previousFrame) activeTime += Math.min(now - previousFrame, 50);
    previousFrame = now;
    draw();
    animationFrame = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    previousFrame = 0;
    if (reducedMotion.matches) {
      draw();
      return;
    }
    animationFrame = window.requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    previousFrame = 0;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }

  function handleVisibility() {
    if (document.hidden) stop();
    else start();
  }

  function handleMotionPreference() {
    stop();
    if (reducedMotion.matches) draw();
    else start();
  }

  resize();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotion.addEventListener?.("change", handleMotionPreference);
  if (!document.hidden) start();
})();

(() => {
  const canvas = document.getElementById("starfield");
  const context = canvas.getContext("2d", { alpha: true });
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stars = [];
  const palette = [
    { core: "#ffffff", mid: "#dff6ff", edge: "#38bdf8", tail: "rgba(56, 189, 248, .46)" },
    { core: "#ffffff", mid: "#eee8ff", edge: "#a78bfa", tail: "rgba(167, 139, 250, .44)" },
    { core: "#ffffff", mid: "#c7f0ff", edge: "#22d3ee", tail: "rgba(34, 211, 238, .4)" },
    { core: "#ffffff", mid: "#dbeafe", edge: "#818cf8", tail: "rgba(129, 140, 248, .4)" },
  ];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let targetCount = 0;
  let activeStar = null;
  let touchInputActive = false;
  let pointer = { x: 0, y: 0, lastX: 0, lastY: 0, lastTime: 0 };
  let animationFrame = 0;
  let meteor = null;
  let nextMeteorAt = null;

  function makeStar(randomY = true) {
    const radius = 1.9 + Math.random() * 1.6;
    return {
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -10,
      radius,
      speed: 0.65 + Math.random() * 0.55,
      drift: (Math.random() - 0.5) * 0.55,
      vx: 0,
      vy: 0,
      collisionMotion: false,
      collisionSettled: false,
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
    targetCount = width <= 640 ? 24 : Math.min(55, Math.max(32, Math.round((width * height) / 16000)));
    while (stars.length < targetCount) stars.push(makeStar());
    while (stars.length > targetCount) stars.pop();
    ensureAmbientMovers();
  }

  function ensureAmbientMovers() {
    let movingCount = stars.filter((star) => star.ambientMover && !star.launched && !star.held).length;
    for (const star of stars) {
      if (movingCount >= 7) break;
      if (!star.ambientMover && !star.launched && !star.held && !star.collisionSettled) {
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
    const visibleTrail = star.trail;
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
      context.lineWidth = star.held ? r * 1.2 : r * 0.85;
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

  function resolveCollisions(time) {
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

        const motionScale = reducedMotion.matches ? 0.55 : 1;
        const firstVx = first.launched ? first.vx : first.ambientMover
          ? first.drift + Math.sin(time * 0.00045 + first.phase) * 0.045 * motionScale : 0;
        const firstVy = first.launched ? first.vy : first.ambientMover
          ? first.speed + Math.sin(time * 0.00065 + first.phase) * 0.035 * motionScale : 0;
        const secondVx = second.launched ? second.vx : second.ambientMover
          ? second.drift + Math.sin(time * 0.00045 + second.phase) * 0.045 * motionScale : 0;
        const secondVy = second.launched ? second.vy : second.ambientMover
          ? second.speed + Math.sin(time * 0.00065 + second.phase) * 0.035 * motionScale : 0;
        const relativeNormal = (secondVx - firstVx) * nx + (secondVy - firstVy) * ny;
        if (relativeNormal >= 0) continue;

        const firstMass = first.radius * first.radius;
        const secondMass = second.radius * second.radius;
        const restitution = 0.9;
        const impulse = -(1 + restitution) * relativeNormal / (1 / firstMass + 1 / secondMass);
        const firstAfterX = firstVx - (impulse / firstMass) * nx;
        const firstAfterY = firstVy - (impulse / firstMass) * ny;
        const secondAfterX = secondVx + (impulse / secondMass) * nx;
        const secondAfterY = secondVy + (impulse / secondMass) * ny;

        for (const [star, vx, vy] of [
          [first, firstAfterX, firstAfterY],
          [second, secondAfterX, secondAfterY],
        ]) {
          star.ambientMover = false;
          star.vx = vx;
          star.vy = vy;
          star.collisionMotion = true;
          star.collisionSettled = false;
          if (Math.hypot(vx, vy) < 0.18) {
            star.launched = false;
            star.vx = 0;
            star.vy = 0;
            star.collisionMotion = false;
            star.collisionSettled = true;
          } else {
            star.launched = true;
          }
        }
      }
    }
  }

  function drawMeteor(time) {
    if (reducedMotion.matches) return;
    if (nextMeteorAt === null) nextMeteorAt = time + 10000 + Math.random() * 8000;
    if (!meteor && time >= nextMeteorAt) {
      meteor = {
        x: Math.random() * width * 0.35,
        y: Math.random() * height * 0.25,
        dx: width * 0.85,
        dy: height * 0.42,
        startedAt: time,
        duration: 900 + Math.random() * 350,
      };
      nextMeteorAt = time + 18000 + Math.random() * 12000;
    }
    if (!meteor) return;

    const progress = (time - meteor.startedAt) / meteor.duration;
    if (progress >= 1) {
      meteor = null;
      return;
    }

    const x = meteor.x + meteor.dx * progress;
    const y = meteor.y + meteor.dy * progress;
    const directionLength = Math.hypot(meteor.dx, meteor.dy);
    const tailLength = 150;
    const tailX = x - (meteor.dx / directionLength) * tailLength;
    const tailY = y - (meteor.dy / directionLength) * tailLength;
    const fade = Math.sin(Math.PI * progress);
    context.save();
    context.globalAlpha = 0.55 * fade;
    context.shadowColor = "#38bdf8";
    context.shadowBlur = 18;
    const gradient = context.createLinearGradient(x, y, tailX, tailY);
    gradient.addColorStop(0, "rgba(255,255,255,.95)");
    gradient.addColorStop(0.2, "rgba(155,197,255,.68)");
    gradient.addColorStop(1, "rgba(120,160,255,0)");
    context.strokeStyle = gradient;
    context.lineWidth = 2;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(tailX, tailY);
    context.stroke();
    context.fillStyle = "rgba(255,255,255,.95)";
    context.beginPath();
    context.arc(x, y, 2.3, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function frame(time) {
    context.clearRect(0, 0, width, height);
    drawMeteor(time);
    for (let i = stars.length - 1; i >= 0; i -= 1) {
      const star = stars[i];
      if (star.held) {
        star.x = pointer.x;
        star.y = pointer.y;
      } else if (star.launched) {
        star.x += star.vx;
        star.y += star.vy;
        const drag = star.collisionMotion ? 0.992 : 0.999;
        star.vx *= drag;
        star.vy *= drag;
        if (star.collisionMotion && Math.hypot(star.vx, star.vy) < 0.18) {
          star.launched = false;
          star.collisionMotion = false;
          star.collisionSettled = true;
          star.vx = 0;
          star.vy = 0;
          star.trail.length = 0;
        }
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
        if (star.x < -24) {
          star.x = width + 24;
          star.trail.length = 0;
        }
        if (star.x > width + 24) {
          star.x = -24;
          star.trail.length = 0;
        }
      }
      if (star.trail.length === 0 || Math.hypot(star.x - star.trail[0].x, star.y - star.trail[0].y) > 2) {
        star.trail.unshift({ x: star.x, y: star.y });
        if (star.trail.length > 10) star.trail.pop();
      }
      drawStar(star, time);
    }
    resolveCollisions(time);
    while (stars.length < targetCount) stars.push(makeStar());
    ensureAmbientMovers();
    animationFrame = window.requestAnimationFrame(frame);
  }

  function localPoint(event) {
    return { x: event.clientX, y: event.clientY };
  }

  function beginStarDrag(x, y) {
    let nearest = null;
    let nearestDistance = 38;
    for (const star of stars) {
      const distance = Math.hypot(star.x - x, star.y - y);
      if (distance < nearestDistance) {
        nearest = star;
        nearestDistance = distance;
      }
    }
    if (!nearest) return false;
    activeStar = nearest;
    activeStar.held = true;
    activeStar.ambientMover = false;
    activeStar.collisionMotion = false;
    activeStar.collisionSettled = false;
    pointer = { x, y, lastX: x, lastY: y, lastTime: performance.now() };
    return true;
  }

  function moveActiveStar(x, y, now = performance.now()) {
    if (!activeStar) return;
    const elapsed = Math.max(8, now - pointer.lastTime);
    pointer.x = x;
    pointer.y = y;
    activeStar.vx = Math.max(-9, Math.min(9, ((x - pointer.lastX) / elapsed) * 16 * 0.38));
    activeStar.vy = Math.max(-9, Math.min(9, ((y - pointer.lastY) / elapsed) * 16 * 0.38));
    pointer.lastX = x;
    pointer.lastY = y;
    pointer.lastTime = now;
  }

  function onPointerDown(event) {
    if (touchInputActive && event.pointerType === "touch") return;
    if (event.button !== 0 && event.pointerType !== "touch") return;
    if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select")) return;
    const { x, y } = localPoint(event);
    if (beginStarDrag(x, y) && event.pointerType === "touch") event.preventDefault();
  }

  function onPointerMove(event) {
    if (touchInputActive && event.pointerType === "touch") return;
    if (!activeStar) return;
    const { x, y } = localPoint(event);
    moveActiveStar(x, y);
    event.preventDefault();
  }

  function onTouchStart(event) {
    if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select")) return;
    touchInputActive = true;
    const touch = event.changedTouches[0];
    if (!touch) return;
    if (!activeStar) beginStarDrag(touch.clientX, touch.clientY);
    if (activeStar) event.preventDefault();
  }

  function onTouchMove(event) {
    if (!activeStar) return;
    const touch = event.touches[0];
    if (!touch) return;
    moveActiveStar(touch.clientX, touch.clientY);
    event.preventDefault();
  }

  function onTouchEnd() {
    onPointerUp();
    touchInputActive = false;
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

  if (!reducedMotion.matches) {
    window.addEventListener("pointermove", (event) => {
      document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
    }, { passive: true });
  }

  document.querySelectorAll(".spotlight-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
      card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
    }, { passive: true });
  });

  const signalPanel = document.querySelector(".signal-panel");
  const signalCaption = document.getElementById("signal-caption");
  const signalFootnote = document.querySelector(".signal-footnote");
  const signalButtons = document.querySelectorAll("[data-signal-view]");
  signalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.signalView;
      if (!signalPanel || !signalCaption || !signalFootnote) return;
      signalPanel.dataset.mode = mode;
      signalButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      if (mode === "model") {
        signalCaption.textContent = "MODEL PREVIEW · FEATURES → FLAGS";
        signalFootnote.textContent = "Model pipeline preview · prediction workflow in development";
      } else {
        signalCaption.textContent = "RAW PPG · 30 SECOND WINDOW";
        signalFootnote.textContent = "Illustrative PPG waveform · sample visualization";
      }
    });
  });

  resize();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  // Pointer Events cover modern touch browsers; these explicit touch listeners
  // keep dragging dependable on mobile browsers that still synthesize pointers.
  document.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchMove, { passive: false });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
  document.addEventListener("touchcancel", onTouchEnd, { passive: true });
  reducedMotion.addEventListener?.("change", () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(frame);
  });
  animationFrame = window.requestAnimationFrame(frame);
})();
