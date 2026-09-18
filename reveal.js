export const REVEAL_MODES = Object.freeze({
  BANDS: "bands",
  BLUR: "blur",
  MOSAIC: "mosaic",
});

const DEFAULT_COLUMNS = 10;
const DEFAULT_SEED = 12345;

const modeFactories = {
  [REVEAL_MODES.BANDS]: createBandsMode,
  [REVEAL_MODES.BLUR]: createBlurMode,
  [REVEAL_MODES.MOSAIC]: createMosaicMode,
};

export function createRevealEngine(
  canvas,
  {
    image,
    durationSeconds,
    mode = REVEAL_MODES.MOSAIC,
    blurPixels,
    columns = DEFAULT_COLUMNS,
    rows,
    seed = DEFAULT_SEED,
    zones = [],
  },
) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError("A canvas element is required.");
  }

  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError("durationSeconds must be greater than zero.");
  }

  if (!Array.isArray(zones)) {
    throw new TypeError("zones must be an array.");
  }

  if (blurPixels !== undefined && (!Number.isFinite(blurPixels) || blurPixels <= 0)) {
    throw new RangeError("blurPixels must be greater than zero.");
  }

  const sourceSize = getImageSize(image);
  const normalizedZones = normalizeZones(zones, sourceSize);
  const grid = getGridSize(sourceSize, columns, rows);
  const createMode = modeFactories[mode];

  if (!createMode) {
    throw new Error(`Unsupported reveal mode: ${mode}`);
  }

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("A 2D canvas context is required.");
  }

  const revealMode = createMode({
    blurPixels,
    canvas,
    columns: grid.columns,
    context,
    image,
    rows: grid.rows,
    sourceSize,
    seed,
    zones: normalizedZones,
  });
  const durationMilliseconds = durationSeconds * 1000;
  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let animationFrameId = null;
  let startedAt = null;
  let elapsedMilliseconds = 0;
  let isRunning = false;

  resize(sourceSize.width, sourceSize.height);

  function start() {
    if (isRunning || isComplete()) {
      return;
    }

    isRunning = true;
    startedAt = performance.now() - elapsedMilliseconds;
    animationFrameId = requestAnimationFrame(animate);
  }

  function pause() {
    if (!isRunning) {
      return;
    }

    isRunning = false;
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  function reset() {
    pause();
    elapsedMilliseconds = 0;
    startedAt = null;
    render(true);
  }

  function update(nextElapsedMilliseconds) {
    if (!Number.isFinite(nextElapsedMilliseconds) || nextElapsedMilliseconds < 0) {
      throw new RangeError("elapsedMilliseconds must be greater than or equal to zero.");
    }

    pause();
    elapsedMilliseconds = Math.min(nextElapsedMilliseconds, durationMilliseconds);
    render();
  }

  function setElapsed(nextElapsedMilliseconds) {
    update(nextElapsedMilliseconds);
  }

  function stop() {
    pause();
  }

  function resize(maximumWidth, maximumHeight) {
    if (
      !Number.isFinite(maximumWidth) ||
      !Number.isFinite(maximumHeight) ||
      maximumWidth <= 0 ||
      maximumHeight <= 0
    ) {
      throw new RangeError("Canvas dimensions must be greater than zero.");
    }

    const scale = Math.min(
      maximumWidth / sourceSize.width,
      maximumHeight / sourceSize.height,
    );

    canvas.width = Math.max(1, Math.round(sourceSize.width * scale));
    canvas.height = Math.max(1, Math.round(sourceSize.height * scale));
    render(true);
  }

  function destroy() {
    pause();
  }

  function render(force = false) {
    revealMode.render(getRenderProgress(), force);
  }

  function getState() {
    return {
      mode,
      elapsedMilliseconds,
      durationMilliseconds,
      progress: getProgress(),
      isComplete: isComplete(),
      isRunning,
    };
  }

  function animate(now) {
    elapsedMilliseconds = Math.min(now - startedAt, durationMilliseconds);
    render();

    if (isComplete()) {
      isRunning = false;
      animationFrameId = null;
      return;
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  function getProgress() {
    return Math.min(elapsedMilliseconds / durationMilliseconds, 1);
  }

  function getRenderProgress() {
    if (prefersReducedMotion && !isComplete()) {
      return 0;
    }

    return getProgress();
  }

  function isComplete() {
    return elapsedMilliseconds >= durationMilliseconds;
  }

  return {
    destroy,
    getState,
    pause,
    render,
    reset,
    resize,
    setElapsed,
    start,
    stop,
    update,
  };
}

function createBlurMode({ blurPixels, canvas, context, image, sourceSize, zones }) {
  const maximumBlur =
    blurPixels ?? Math.max(18, Math.round(Math.min(sourceSize.width, sourceSize.height) * 0.1));
  const priorityZones = zones
    .filter((zone) => Array.isArray(zone.points) && zone.points.length >= 3)
    .sort((firstZone, secondZone) => {
      return getZonePriority(firstZone.type) - getZonePriority(secondZone.type);
    });
  let renderedBlur = null;

  function render(progress, force) {
    const baseBlur = roundBlur(maximumBlur * (1 - progress));

    if (!force && baseBlur === renderedBlur) {
      return;
    }

    renderedBlur = baseBlur;
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawBlurredImage(baseBlur);

    for (const zone of priorityZones) {
      drawZone(zone, getZoneBlur(zone.type, baseBlur, progress));
    }
  }

  function drawZone(zone, blur) {
    context.save();
    context.beginPath();

    zone.points.forEach((point, index) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;

      if (index === 0) {
        context.moveTo(x, y);
        return;
      }

      context.lineTo(x, y);
    });

    context.closePath();
    context.clip();
    drawBlurredImage(blur);
    context.restore();
  }

  function drawBlurredImage(blur) {
    context.save();
    context.filter = blur > 0 ? `blur(${blur}px)` : "none";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    context.restore();
  }

  return { render };
}

function createBandsMode({
  canvas,
  columns,
  context,
  image,
  rows,
  seed,
  sourceSize,
  zones,
}) {
  const revealOrder = generateBandRevealOrder(rows, columns, seed, zones);
  let renderedBandCount = -1;

  function render(progress, force) {
    const revealedBandCount = Math.floor(progress * revealOrder.length);

    if (!force && revealedBandCount === renderedBandCount) {
      return;
    }

    renderedBandCount = revealedBandCount;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (revealedBandCount === revealOrder.length) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return;
    }

    context.fillStyle = "#213430";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < revealedBandCount; index += 1) {
      const { row } = revealOrder[index];
      const sourceY = (row * sourceSize.height) / rows;
      const sourceHeight = sourceSize.height / rows;
      const destinationY = (row * canvas.height) / rows;
      const destinationHeight = canvas.height / rows;

      context.drawImage(
        image,
        0,
        sourceY,
        sourceSize.width,
        sourceHeight,
        0,
        destinationY,
        canvas.width,
        destinationHeight,
      );
    }
  }

  return { render };
}

function createMosaicMode({
  canvas,
  columns,
  context,
  image,
  rows,
  sourceSize,
  seed,
  zones,
}) {
  const revealOrder = generateRevealOrder(rows, columns, seed, zones);
  let renderedTileCount = -1;

  function render(progress, force) {
    const revealedTileCount = Math.floor(progress * revealOrder.length);

    if (!force && revealedTileCount === renderedTileCount) {
      return;
    }

    renderedTileCount = revealedTileCount;
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (revealedTileCount === revealOrder.length) {
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return;
    }

    context.fillStyle = "#213430";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < revealedTileCount; index += 1) {
      drawTile(revealOrder[index]);
    }
  }

  function drawTile(tile) {
    const sourceX = (tile.column * sourceSize.width) / columns;
    const sourceY = (tile.row * sourceSize.height) / rows;
    const sourceWidth = sourceSize.width / columns;
    const sourceHeight = sourceSize.height / rows;
    const destinationX = (tile.column * canvas.width) / columns;
    const destinationY = (tile.row * canvas.height) / rows;
    const destinationWidth = canvas.width / columns;
    const destinationHeight = canvas.height / rows;

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      destinationX,
      destinationY,
      destinationWidth,
      destinationHeight,
    );
  }

  return { render };
}

function getZoneBlur(type, baseBlur, progress) {
  if (type === "main") {
    return roundBlur(baseBlur * (1 + 1.5 * (1 - progress)));
  }

  if (type === "secondary") {
    return roundBlur(baseBlur * (1 + 0.5 * (1 - progress)));
  }

  return baseBlur;
}

function roundBlur(value) {
  return Math.round(value * 2) / 2;
}

export function generateRevealOrder(
  rows,
  columns,
  seed = DEFAULT_SEED,
  zones = [],
) {
  validateGridDimension(rows, "rows");
  validateGridDimension(columns, "columns");

  const tiles = calculateMosaicPriorities(rows, columns, zones);
  const random = createSeededRandom(seed);

  return tiles
    .map((tile) => ({
      ...tile,
      revealMoment: getRevealMoment(tile.priority, random()),
      tieBreaker: random(),
    }))
    .sort(
      (firstTile, secondTile) =>
        firstTile.revealMoment - secondTile.revealMoment ||
        firstTile.tieBreaker - secondTile.tieBreaker,
    )
    .map(({ column, row }) => ({ column, row }));
}

export function calculateMosaicPriorities(rows, columns, zones = []) {
  validateGridDimension(rows, "rows");
  validateGridDimension(columns, "columns");

  if (!Array.isArray(zones)) {
    throw new TypeError("zones must be an array.");
  }

  const tiles = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      tiles.push({
        column,
        priority: getTilePriority(column, row, columns, rows, zones),
        row,
      });
    }
  }

  return tiles;
}

export function generateBandRevealOrder(
  rows,
  columns,
  seed = DEFAULT_SEED,
  zones = [],
) {
  const priorities = calculateMosaicPriorities(rows, columns, zones);
  const random = createSeededRandom(seed);
  const bands = Array.from({ length: rows }, (_, row) => ({
    row,
    priority: getBandPriority(priorities, row),
  }));

  return bands
    .map((band) => ({
      ...band,
      revealMoment: getRevealMoment(band.priority, random()),
      tieBreaker: random(),
    }))
    .sort(
      (firstBand, secondBand) =>
        firstBand.revealMoment - secondBand.revealMoment ||
        firstBand.tieBreaker - secondBand.tieBreaker,
    )
    .map(({ row }) => ({ row }));
}

function getBandPriority(priorities, row) {
  return priorities
    .filter((tile) => tile.row === row)
    .reduce((highestPriority, tile) => Math.max(highestPriority, tile.priority), 0);
}

function getRevealMoment(priority, randomValue) {
  if (priority === 2) {
    return 0.35 + 0.65 * Math.sqrt(randomValue);
  }

  if (priority === 1) {
    return 0.12 + 0.88 * randomValue;
  }

  return randomValue;
}

function getTilePriority(column, row, columns, rows, zones) {
  return zones.reduce((highestPriority, zone) => {
    if (!doesTileIntersectZone(column, row, columns, rows, zone)) {
      return highestPriority;
    }

    return Math.max(highestPriority, getZonePriority(zone.type));
  }, 0);
}

function getZonePriority(type) {
  if (type === "main") {
    return 2;
  }

  if (type === "secondary") {
    return 1;
  }

  return 0;
}

function doesTileIntersectZone(column, row, columns, rows, zone) {
  if (!Array.isArray(zone.points) || zone.points.length < 3) {
    return false;
  }

  const left = column / columns;
  const top = row / rows;
  const right = (column + 1) / columns;
  const bottom = (row + 1) / rows;
  const samplePoints = [
    { x: left, y: top },
    { x: right, y: top },
    { x: left, y: bottom },
    { x: right, y: bottom },
    { x: (left + right) / 2, y: (top + bottom) / 2 },
  ];

  return (
    samplePoints.some((point) => isPointInPolygon(point, zone.points)) ||
    zone.points.some(
      (point) =>
        point.x >= left &&
        point.x <= right &&
        point.y >= top &&
        point.y <= bottom,
    )
  );
}

function isPointInPolygon(point, polygon) {
  let isInside = false;

  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const currentPoint = polygon[currentIndex];
    const previousPoint = polygon[previousIndex];
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;

    if (intersects) {
      isInside = !isInside;
    }
  }

  return isInside;
}

function getGridSize(sourceSize, columns, rows) {
  validateGridDimension(columns, "columns");

  const calculatedRows =
    rows ?? Math.max(1, Math.round((columns * sourceSize.height) / sourceSize.width));

  validateGridDimension(calculatedRows, "rows");

  return { columns, rows: calculatedRows };
}

function validateGridDimension(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive integer.`);
  }
}

function shuffleTiles(tiles, random) {
  const shuffledTiles = [...tiles];

  for (let index = shuffledTiles.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [shuffledTiles[index], shuffledTiles[randomIndex]] = [
      shuffledTiles[randomIndex],
      shuffledTiles[index],
    ];
  }

  return shuffledTiles;
}

function createSeededRandom(seed) {
  let value = Number.isFinite(seed) ? seed >>> 0 : DEFAULT_SEED;

  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function normalizeZones(zones, sourceSize) {
  return zones.map((zone) => ({
    points: Array.isArray(zone?.points)
      ? zone.points.map((point) => normalizePoint(point, sourceSize)).filter(Boolean)
      : [],
    type: zone?.type,
  }));
}

function normalizePoint(point, sourceSize) {
  const x = Array.isArray(point) ? point[0] : point?.x;
  const y = Array.isArray(point) ? point[1] : point?.y;

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.abs(x) > 1 ? x / sourceSize.width : x,
    y: Math.abs(y) > 1 ? y / sourceSize.height : y,
  };
}

function getImageSize(image) {
  const width = image?.naturalWidth ?? image?.videoWidth ?? image?.width;
  const height = image?.naturalHeight ?? image?.videoHeight ?? image?.height;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new TypeError("image must be loaded and have a valid size.");
  }

  return { width, height };
}
