const canvas = document.querySelector(".court-trace");
const pen = canvas.getContext("2d");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

if (pen) {
  let start;
  let frame;
  let strokes = [];

  function ellipse(cx, cy, rx, ry, startAngle, sweep) {
    return Array.from({ length: 129 }, (_, index) => {
      const angle = startAngle + sweep * index / 128;
      return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)];
    });
  }

  function stroke(points, delay, duration, color, width = 1, dashes = []) {
    let length = 0;
    const segments = points.slice(1).map(([x, y], i) => {
      const [fromX, fromY] = points[i];
      const size = Math.hypot(x - fromX, y - fromY);
      length += size;
      return { x, y, fromX, fromY, size, end: length };
    });
    return { points, segments, length, delay, duration, color, width, dashes };
  }

  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    cancelAnimationFrame(frame);
    if (!width || !height) return;
    start ??= performance.now();
    const scale = devicePixelRatio || 1;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    pen.setTransform(scale, 0, 0, scale, 0, 0);

    const left = .5;
    const right = width - .5;
    const bottom = height - .5;
    const arcRadiusY = height * .7 * .72;
    const arcCenterY = height * .3 + arcRadiusY;
    const arc = ellipse(width / 2, arcCenterY, width / 2 - .5, arcRadiusY, Math.PI, Math.PI);
    const circleRadius = Math.min(width * .30, innerHeight * .21) / 2;
    const laneLeft = width / 2 - circleRadius;
    const laneRight = width / 2 + circleRadius;
    const paintLeft = width * .3 + .5;
    const paintRight = width * .7 - .5;
    const paintTop = height * .41 + .5;
    const circle = ellipse(width / 2, height * .3 + circleRadius, Math.max(.5, circleRadius - 1),
      Math.max(.5, circleRadius - 1), Math.PI, Math.PI * 2);

    strokes = [
      stroke([[left, bottom], ...arc, [right, bottom], [left, bottom]], 0, 2400, "#999"),
      stroke([[paintLeft, bottom], [paintLeft, paintTop], [paintRight, paintTop], [paintRight, bottom], [paintLeft, bottom]], 360, 1850, "#ddd"),
      stroke(circle, 720, 1570, "#fff", 2, [1, 4]),
      stroke([[laneLeft, height * .45], [laneLeft, bottom]], 1050, 1050, "#eee", 1, [3, 3]),
      stroke([[laneRight, height * .45], [laneRight, bottom]], 1450, 1050, "#eee", 1, [3, 3])
    ];

    draw(performance.now());
  }

  function draw(now) {
    pen.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const elapsed = reducedMotion.matches ? Infinity : now - start;
    let pending = false;
    for (const line of strokes) {
      const progress = Math.min(1, (elapsed - line.delay) / line.duration);
      if (progress < 1) pending = true;
      if (progress <= 0) continue;
      const distance = line.length * progress;
      pen.beginPath();
      pen.moveTo(...line.points[0]);
      for (const segment of line.segments) {
        if (segment.end <= distance) {
          pen.lineTo(segment.x, segment.y);
        } else {
          const fraction = (distance - segment.end + segment.size) / segment.size;
          pen.lineTo(segment.fromX + (segment.x - segment.fromX) * fraction,
            segment.fromY + (segment.y - segment.fromY) * fraction);
          break;
        }
      }
      pen.strokeStyle = line.color;
      pen.lineWidth = line.width;
      pen.lineCap = line.width === 2 ? "round" : "butt";
      pen.setLineDash(line.dashes);
      pen.stroke();
    }
    if (pending) frame = requestAnimationFrame(draw);
  }

  canvas.parentElement.classList.add("court-tracing");
  new ResizeObserver(resize).observe(canvas);
  reducedMotion.addEventListener("change", resize);
}
