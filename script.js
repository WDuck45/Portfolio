(() => {
  const canvas = document.getElementById("constellation-field");
  if (!canvas) return;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) return;

  const MAX_PARTICLES = 120;
  const MAX_CONCURRENT_CONSTELLATIONS = 3;
  const MAX_NODES_PER_CONSTELLATION = 10;
  const SPAWN_INTERVAL_MS = 20000;
  const FORMATION_MS = 40000;
  const FADE_MS = 12000;
  const LINE_INTRO_MS = 6000;
  const INSTANCE_LIFETIME_MS = FORMATION_MS + FADE_MS;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const anchors = [[.2, .3], [.78, .3], [.5, .72]];
  const groups = [
    { color: [56, 189, 248], size: 1, points: [[-1, 0], [-.45, -.65], [.2, -.8], [.85, -.35], [.75, .4], [.05, .75], [-.7, .5]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 6], [6, 5]] },
    { color: [167, 139, 250], size: 1, points: [[-1, -.45], [-.35, -.8], [.35, -.6], [.95, -.05], [.55, .65], [-.2, .85], [-.75, .35]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [2, 5]] },
    { color: [125, 211, 252], size: 1, points: [[-1, -.1], [-.5, -.8], [.1, -.55], [.85, -.7], [.55, .05], [.95, .7], [.1, .8], [-.55, .55]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [2, 4]] },
    { color: [196, 181, 253], size: 1, points: [[-1, .65], [-.7, -.35], [-.2, -.8], [.45, -.7], [1, -.1], [.35, .05], [-.1, .8]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2], [5, 6], [6, 0]] },
    { color: [103, 232, 249], size: 1, points: [[-1, -.55], [-.5, -.15], [-.8, .5], [-.1, .9], [.35, .35], [.95, .55], [.6, -.35], [.05, -.8]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [1, 4], [4, 6]] },
    { color: [147, 197, 253], size: 1, points: [[-1, .45], [-.65, -.4], [-.15, .15], [.15, -.85], [.4, .12], [1, -.55], [.75, .65]], links: [[0, 1], [1, 2], [2, 0], [2, 3], [3, 4], [4, 5], [5, 6], [6, 4]] },
    { color: [192, 132, 252], size: 1, points: [[-1, -.2], [-.55, -.7], [-.1, -.15], [.25, -.8], [.65, -.25], [1, .15], [.55, .65], [.05, .35], [-.45, .8]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0]] },
    { color: [94, 234, 212], size: 1, points: [[-1, .55], [-.65, -.45], [-.2, .25], [.1, -.8], [.45, .2], [.8, -.55], [1, .6]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [2, 4]] },
    { color: [129, 140, 248], size: 1, points: [[-1, -.75], [-.35, -.45], [.25, -.95], [.95, -.55], [.4, -.05], [.95, .55], [.1, .9], [-.45, .35], [-.95, .75]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 1], [4, 7]] },
    { color: [125, 211, 252], size: 1, points: [[-1, .1], [-.55, -.7], [.1, -.9], [.75, -.45], [.95, .35], [.35, .85], [-.4, .65]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 3], [3, 5]] },
    { color: [167, 139, 250], size: 1, points: [[-1, -.5], [-.3, -.1], [.3, -.8], [.75, -.2], [1, .55], [.25, .35], [-.25, .9], [-.7, .45]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [1, 5], [5, 3]] },
    { color: [103, 232, 249], size: 1.35, points: [[-1, -.7], [-.65, -.15], [-.9, .55], [-.35, .9], [.05, .35], [.4, .9], [.9, .55], [.65, -.1], [1, -.7]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0]] },
    { color: [192, 132, 252], size: 1.45, points: [[-1, .45], [-.7, -.05], [-.8, -.65], [-.25, -.9], [.1, -.45], [.5, -.9], [1, -.5], [.72, .05], [1, .55], [.2, .9]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0], [4, 7]] },
    { color: [56, 189, 248], size: 1.25, points: [[-1, -.7], [-.6, -.35], [-.15, -.8], [.2, -.35], [.75, -.7], [1, -.15], [.5, .05], [.9, .6], [.1, .85]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [3, 6]] },
    { color: [94, 234, 212], size: 1.4, points: [[-1, .5], [-.72, -.1], [-.85, -.75], [-.35, -.45], [-.05, -.9], [.25, -.35], [.65, -.8], [1, -.35], [.45, .75]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [3, 8]] },
    { color: [129, 140, 248], size: .82, points: [[-1, -.2], [-.7, -.7], [-.35, -.25], [-.1, -.9], [.25, -.4], [.65, -.85], [1, -.3], [.65, .35], [-.2, .8]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0]] },
    { color: [196, 181, 253], size: 1.3, points: [[-1, .1], [-.72, -.45], [-.55, -.95], [-.2, -.5], [.05, -.95], [.35, -.4], [.72, -.85], [1, -.25], [.6, .55], [-.35, .65]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0], [3, 9]] },
    { color: [125, 211, 252], size: 1.5, points: [[-1, -.6], [-.55, -.1], [-.85, .6], [-.25, .25], [0, -.8], [.45, -.35], [.9, -.7], [.55, .35], [1, .75]], links: [[0, 1], [1, 2], [2, 3], [3, 1], [1, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 3]] },
    { color: [167, 139, 250], size: .9, points: [[-1, .45], [-.7, -.4], [-.2, -.75], [.2, -.25], [.7, -.7], [1, .05], [.55, .75], [0, .5], [-.5, .9]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 0], [3, 7]] },
    { color: [103, 232, 249], size: 1.35, points: [[-1, -.55], [-.65, .05], [-.8, .75], [-.2, .5], [.05, -.1], [.3, -.8], [.75, -.45], [1, .2], [.55, .85], [-.25, .95]], links: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 2], [4, 7]] },
  ];
  const dust = Array.from({ length: MAX_PARTICLES }, () => ({
    x: 0,
    y: 0,
    phase: Math.random() * Math.PI * 2,
    radius: .45 + Math.random() * .55,
  }));
  const constellations = [];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let activeParticleCount = MAX_PARTICLES;
  let activeTime = 0;
  let previousFrame = 0;
  let animationFrame = 0;
  let running = false;
  let nextSpawnAt = 0;
  let lastGroupIndex = -1;
  let formationIndex = 0;

  function smoothstep(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  }

  function chooseGroupIndex() {
    let index = Math.floor(Math.random() * groups.length);
    if (groups.length > 1 && index === lastGroupIndex) index = (index + 1 + Math.floor(Math.random() * (groups.length - 1))) % groups.length;
    lastGroupIndex = index;
    return index;
  }

  function targetPoint(point, group, anchor) {
    const scale = Math.min(width, height) * .105 * group.size;
    return {
      x: Math.max(18, Math.min(width - 18, anchor[0] * width + point[0] * scale)),
      y: Math.max(18, Math.min(height - 18, anchor[1] * height + point[1] * scale)),
    };
  }

  function createConstellation(startTime) {
    const groupIndex = chooseGroupIndex();
    const group = groups[groupIndex];
    const anchor = anchors[formationIndex % anchors.length];
    formationIndex += 1;
    const nodes = group.points.slice(0, MAX_NODES_PER_CONSTELLATION).map((point) => {
      const target = targetPoint(point, group, anchor);
      return {
        point,
        startX: Math.random() * width,
        startY: Math.random() * height,
        targetX: target.x,
        targetY: target.y,
        x: 0,
        y: 0,
        phase: Math.random() * Math.PI * 2,
        radius: 1 + Math.random() * .45,
      };
    });
    return { group, groupIndex, anchor, startTime, nodes };
  }

  function updateConstellations() {
    for (let index = constellations.length - 1; index >= 0; index -= 1) {
      if (activeTime - constellations[index].startTime >= INSTANCE_LIFETIME_MS) constellations.splice(index, 1);
    }
    while (activeTime >= nextSpawnAt) {
      if (constellations.length < MAX_CONCURRENT_CONSTELLATIONS) {
        constellations.push(createConstellation(nextSpawnAt));
      }
      nextSpawnAt += SPAWN_INTERVAL_MS;
    }
  }

  function resize() {
    const previousWidth = width || window.innerWidth;
    const previousHeight = height || window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    activeParticleCount = width <= 640 ? 60 : MAX_PARTICLES;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    dust.forEach((particle) => {
      particle.x = Math.random() * width;
      particle.y = Math.random() * height;
    });
    const scaleX = width / previousWidth;
    const scaleY = height / previousHeight;
    constellations.forEach((instance) => {
      instance.nodes.forEach((node) => {
        node.startX *= scaleX;
        node.startY *= scaleY;
        const target = targetPoint(node.point, instance.group, instance.anchor);
        node.targetX = target.x;
        node.targetY = target.y;
      });
    });
    draw();
  }

  function draw() {
    updateConstellations();
    context.clearRect(0, 0, width, height);
    const constellationNodeCount = constellations.reduce((count, item) => count + item.nodes.length, 0);
    const dustCount = Math.max(0, activeParticleCount - constellationNodeCount);
    for (let index = 0; index < dustCount; index += 1) {
      const particle = dust[index];
      const t = activeTime * .00018 + particle.phase;
      const x = particle.x + Math.sin(t) * 5;
      const y = particle.y + Math.cos(t * .83) * 5;
      const twinkle = .55 + (Math.sin(activeTime * .001 + particle.phase) + 1) * .16;
      context.globalAlpha = twinkle * .18;
      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = "#c8d8f5";
      context.fill();
    }

    const driftAmount = 1.8;
    const time = reducedMotion.matches ? 0 : activeTime;
    const easingTime = reducedMotion.matches ? 1 : undefined;
    const fadeStart = FORMATION_MS;

    constellations.forEach((instance) => {
      const age = Math.max(0, activeTime - instance.startTime);
      const progress = easingTime ?? Math.min(age / FORMATION_MS, 1);
      const eased = smoothstep(progress);
      const opacity = age <= fadeStart ? 1 : 1 - smoothstep((age - fadeStart) / FADE_MS);
      instance.nodes.forEach((node) => {
        const t = time * .00018 + node.phase;
        node.x = node.startX + (node.targetX - node.startX) * eased + Math.sin(t) * driftAmount * .4;
        node.y = node.startY + (node.targetY - node.startY) * eased + Math.cos(t * .83) * driftAmount * .4;
      });

      context.beginPath();
      instance.group.links.forEach(([from, to]) => {
        if (!instance.nodes[from] || !instance.nodes[to]) return;
        context.moveTo(instance.nodes[from].x, instance.nodes[from].y);
        context.lineTo(instance.nodes[to].x, instance.nodes[to].y);
      });
      const lineIntro = smoothstep(age / LINE_INTRO_MS);
      const lineOpacity = (.025 + .07 * lineIntro + .105 * eased) * opacity;
      context.strokeStyle = `rgba(${instance.group.color.join(",")},${lineOpacity})`;
      context.lineWidth = 0.7;
      context.stroke();

      instance.nodes.forEach((node) => {
        const twinkle = .55 + (Math.sin(time * .001 + node.phase) + 1) * .16;
        context.globalAlpha = twinkle * (.28 + eased * .52) * opacity;
        context.beginPath();
        context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        context.fillStyle = instance.group.color[0] === 167 || instance.group.color[0] === 192 ? "#e7dcff" : "#d8f5ff";
        context.fill();
      });
    });
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
      activeTime = SPAWN_INTERVAL_MS * 2;
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
    if (reducedMotion.matches) {
      activeTime = Math.max(activeTime, SPAWN_INTERVAL_MS * 2);
      draw();
    } else start();
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
  const MAX_EXTRA_STARS = 7;
  const MAX_MOVING_STARS = 5;
  let activeStar = null;
  let touchInputActive = false;
  let pendingTouch = null;
  let touchHoldTimer = 0;
  let pointer = { x: 0, y: 0, lastX: 0, lastY: 0, lastTime: 0 };
  let animationFrame = 0;
  let meteor = null;
  let nextMeteorAt = null;

  function balancedPosition(randomY = true) {
    const columns = Math.max(1, Math.ceil(Math.sqrt(targetCount * width / Math.max(height, 1))));
    const rows = Math.max(1, Math.ceil(targetCount / columns));
    const occupancy = Array(columns * rows).fill(0);
    stars.forEach((star) => {
      const x = Math.max(0, Math.min(width - 1, star.x));
      const y = Math.max(0, Math.min(height - 1, star.y));
      const column = Math.min(columns - 1, Math.floor(x / width * columns));
      const row = Math.min(rows - 1, Math.floor(y / height * rows));
      occupancy[row * columns + column] += 1;
    });
    const leastOccupied = Math.min(...occupancy);
    const candidates = occupancy.flatMap((count, index) => count === leastOccupied ? [index] : []);
    const cell = candidates[Math.floor(Math.random() * candidates.length)];
    const column = cell % columns;
    const row = Math.floor(cell / columns);
    const jitterX = .14 + Math.random() * .72;
    const jitterY = .14 + Math.random() * .72;
    return {
      x: (column + jitterX) * width / columns,
      y: randomY ? (row + jitterY) * height / rows : -10,
    };
  }

  function countAutonomousMovers() {
    return stars.filter((star) => !star.userThrown && !star.held && (
      star.ambientMover || (star.launched && star.collisionMotion)
    )).length;
  }

  function makeStar(randomY = true) {
    const radius = 1.9 + Math.random() * 1.6;
    const position = balancedPosition(randomY);
    return {
      x: position.x,
      y: position.y,
      radius,
      speed: 0.65 + Math.random() * 0.55,
      drift: (Math.random() - 0.5) * 0.55,
      vx: 0,
      vy: 0,
      collisionMotion: false,
      collisionSettled: false,
      settleAfterCollision: false,
      trail: [],
      launched: false,
      userThrown: false,
      ambientMover: countAutonomousMovers() < MAX_MOVING_STARS,
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
    targetCount = width <= 640 ? 27 : Math.min(60, Math.max(35, Math.round((width * height) / 14500)));
    while (stars.length < targetCount) stars.push(makeStar());
    while (stars.length > targetCount) stars.pop();
    ensureAmbientMovers();
  }

  function ensureAmbientMovers() {
    let movingCount = countAutonomousMovers();
    for (const star of stars) {
      if (movingCount >= MAX_MOVING_STARS) break;
      if (!star.ambientMover && !star.launched && !star.held && !star.collisionSettled && !star.userThrown) {
        star.ambientMover = true;
        movingCount += 1;
      }
    }
    while (movingCount < MAX_MOVING_STARS && stars.length < targetCount + MAX_EXTRA_STARS) {
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
        const restitution = 0.86;
        const impulse = -(1 + restitution) * relativeNormal / (1 / firstMass + 1 / secondMass);
        const firstAfterX = firstVx - (impulse / firstMass) * nx;
        const firstAfterY = firstVy - (impulse / firstMass) * ny;
        const secondAfterX = secondVx + (impulse / secondMass) * nx;
        const secondAfterY = secondVy + (impulse / secondMass) * ny;

        for (const [star, vx, vy, direction] of [
          [first, firstAfterX, firstAfterY, -1],
          [second, secondAfterX, secondAfterY, 1],
        ]) {
          const speed = Math.hypot(vx, vy);
          const alreadyCounted = !star.userThrown && !star.held && (star.ambientMover || (star.launched && star.collisionMotion));
          const atMovingLimit = countAutonomousMovers() >= MAX_MOVING_STARS && !alreadyCounted && !star.userThrown;
          const settles = atMovingLimit || Math.random() < 0.22;
          const cruiseSpeed = settles ? speed : Math.max(speed, 0.9);
          const angle = speed > 0.001 ? Math.atan2(vy, vx) : Math.atan2(ny * direction, nx * direction);

          star.ambientMover = false;
          star.vx = Math.cos(angle) * cruiseSpeed;
          star.vy = Math.sin(angle) * cruiseSpeed;
          star.collisionMotion = true;
          star.collisionSettled = false;
          star.settleAfterCollision = settles;
          if (settles && cruiseSpeed < 0.18) {
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
        const drag = star.collisionMotion
          ? (star.settleAfterCollision ? 0.992 : 1)
          : 0.999;
        star.vx *= drag;
        star.vy *= drag;
        if (star.collisionMotion && star.settleAfterCollision && Math.hypot(star.vx, star.vy) < 0.18) {
          star.launched = false;
          star.collisionMotion = false;
          star.collisionSettled = true;
          star.settleAfterCollision = false;
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
    activeStar.settleAfterCollision = false;
    activeStar.userThrown = false;
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
    // Touch input uses a hold-to-grab gesture below so vertical swipes remain native scrolling.
    if (event.pointerType === "touch") return;
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("a, button, input, textarea, select")) return;
    const { x, y } = localPoint(event);
    beginStarDrag(x, y);
  }

  function onPointerMove(event) {
    if (touchInputActive && event.pointerType === "touch") return;
    if (!activeStar) return;
    const { x, y } = localPoint(event);
    moveActiveStar(x, y);
  }

  function onTouchStart(event) {
    const blockedTargets = "a, button, input, textarea, select, [role=\"button\"], .mdp-card, .signal-panel, .lab-card, .education-card, .project-card, .beyond-card";
    if (event.target instanceof Element && event.target.closest(blockedTargets)) return;
    touchInputActive = true;
    const touch = event.changedTouches[0];
    if (!touch) return;

    pendingTouch = { x: touch.clientX, y: touch.clientY };
    window.clearTimeout(touchHoldTimer);
    touchHoldTimer = window.setTimeout(() => {
      if (!pendingTouch || activeStar) return;
      if (beginStarDrag(pendingTouch.x, pendingTouch.y)) {
        pendingTouch = null;
        document.addEventListener("touchmove", onActiveTouchMove, { passive: false });
      }
    }, 160);
  }

  function onTouchMove(event) {
    if (activeStar || !pendingTouch) return;
    const touch = event.touches[0];
    if (touch && Math.hypot(touch.clientX - pendingTouch.x, touch.clientY - pendingTouch.y) > 8) {
      window.clearTimeout(touchHoldTimer);
      pendingTouch = null;
    }
  }

  function onActiveTouchMove(event) {
    if (!activeStar) return;
    const touch = event.touches[0];
    if (!touch) return;
    moveActiveStar(touch.clientX, touch.clientY);
    event.preventDefault();
  }

  function onTouchEnd() {
    window.clearTimeout(touchHoldTimer);
    document.removeEventListener("touchmove", onActiveTouchMove);
    pendingTouch = null;
    onPointerUp();
    touchInputActive = false;
  }

  function onPointerUp() {
    if (!activeStar) return;
    activeStar.held = false;
    activeStar.launched = Math.hypot(activeStar.vx, activeStar.vy) > 0.5;
    activeStar.userThrown = activeStar.launched;
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

  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.getElementById("main-navigation");
  const navBackdrop = document.querySelector(".nav-backdrop");
  const mobileNavQuery = window.matchMedia("(max-width: 760px)");

  function setMobileNavOpen(open) {
    if (!navToggle || !mainNav || !navBackdrop) return;
    mainNav.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    navToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    navBackdrop.hidden = !open;
  }

  navToggle?.addEventListener("click", () => {
    setMobileNavOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });
  navBackdrop?.addEventListener("click", () => setMobileNavOpen(false));
  mainNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMobileNavOpen(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMobileNavOpen(false);
  });
  mobileNavQuery.addEventListener?.("change", (event) => {
    if (!event.matches) setMobileNavOpen(false);
  });

  resize();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  // Pointer Events cover modern touch browsers; these explicit touch listeners
  // keep dragging dependable on mobile browsers that still synthesize pointers.
  document.addEventListener("touchstart", onTouchStart, { passive: true });
  document.addEventListener("touchmove", onTouchMove, { passive: true });
  document.addEventListener("touchend", onTouchEnd, { passive: true });
  document.addEventListener("touchcancel", onTouchEnd, { passive: true });
  reducedMotion.addEventListener?.("change", () => {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = window.requestAnimationFrame(frame);
  });
  animationFrame = window.requestAnimationFrame(frame);
})();
