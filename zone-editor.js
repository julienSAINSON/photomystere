const ZONE_TYPES = new Set(["main", "secondary", "normal"]);

export function createZoneEditor(canvas, { image, zones = [], onChange } = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError("A canvas element is required.");
  }

  if (!image?.naturalWidth || !image?.naturalHeight) {
    throw new TypeError("A loaded image is required.");
  }

  const context = canvas.getContext("2d");
  let selectedZoneIndex = 0;
  let activeHandleIndex = null;
  let isDraggingZone = false;
  let lastPointer = null;
  let pendingZoneIndex = null;
  let nextZones = normalizeZones(zones);

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);
  render();

  function addZone(type = "secondary") {
    nextZones.push({ type: normalizeType(type), points: [] });
    selectedZoneIndex = nextZones.length - 1;
    changed();
  }

  function deleteSelectedZone() {
    if (nextZones.length === 1) {
      nextZones[0].points = [];
    } else {
      nextZones.splice(selectedZoneIndex, 1);
      selectedZoneIndex = Math.max(0, selectedZoneIndex - 1);
    }
    changed();
  }

  function removeLastPoint() {
    const zone = nextZones[selectedZoneIndex];

    if (!zone || zone.points.length === 0) {
      return;
    }

    zone.points.pop();
    changed();
  }

  function setSelectedZone(index) {
    selectedZoneIndex = clampIndex(index, nextZones.length);
    render();
  }

  function setSelectedZoneType(type) {
    const zone = nextZones[selectedZoneIndex];
    if (!zone) {
      return;
    }
    zone.type = normalizeType(type);
    changed();
  }

  function getState() {
    return {
      selectedZoneIndex,
      zones: nextZones.map((zone) => ({
        type: zone.type,
        points: zone.points.map((point) => ({ ...point })),
      })),
    };
  }

  function destroy() {
    canvas.removeEventListener("pointerdown", handlePointerDown);
    canvas.removeEventListener("pointermove", handlePointerMove);
    canvas.removeEventListener("pointerup", handlePointerUp);
    canvas.removeEventListener("pointercancel", handlePointerUp);
  }

  function handlePointerDown(event) {
    const point = getNormalizedPoint(event);
    const handle = findHandle(point);

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {}
    lastPointer = point;

    const selectedZone = nextZones[selectedZoneIndex];
    if (selectedZone && selectedZone.points.length < 3) {
      selectedZone.points.push(point);
      changed();
      return;
    }

    if (handle) {
      selectedZoneIndex = handle.zoneIndex;
      activeHandleIndex = handle.pointIndex;
      render();
      return;
    }

    const zoneIndex = findZone(point);
    if (zoneIndex !== -1) {
      selectedZoneIndex = zoneIndex;
      pendingZoneIndex = zoneIndex;
      render();
      return;
    }

    if (selectedZone) {
      selectedZone.points.push(point);
      changed();
    }
  }

  function handlePointerMove(event) {
    if (pendingZoneIndex !== null) {
      const point = getNormalizedPoint(event);
      if (point.x === lastPointer.x && point.y === lastPointer.y) {
        return;
      }
      selectedZoneIndex = pendingZoneIndex;
      pendingZoneIndex = null;
      isDraggingZone = true;
    }

    if (activeHandleIndex === null && !isDraggingZone) {
      return;
    }

    const point = getNormalizedPoint(event);
    const zone = nextZones[selectedZoneIndex];

    if (activeHandleIndex !== null) {
      zone.points[activeHandleIndex] = point;
    } else {
      const deltaX = point.x - lastPointer.x;
      const deltaY = point.y - lastPointer.y;
      zone.points = zone.points.map((zonePoint) => ({
        x: clamp(zonePoint.x + deltaX),
        y: clamp(zonePoint.y + deltaY),
      }));
    }

    lastPointer = point;
    changed();
  }

  function handlePointerUp(event) {
    if (event.type !== "pointercancel" && pendingZoneIndex !== null) {
      const zone = nextZones[pendingZoneIndex];
      if (zone) {
        zone.points.push(lastPointer);
        changed();
      }
    }

    activeHandleIndex = null;
    isDraggingZone = false;
    lastPointer = null;
    pendingZoneIndex = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function changed() {
    render();
    onChange?.(getState());
  }

  function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    nextZones.forEach((zone, zoneIndex) => drawZone(zone, zoneIndex));
  }

  function drawZone(zone, zoneIndex) {
    const isSelected = zoneIndex === selectedZoneIndex;
    const color = getZoneColor(zone.type);
    context.strokeStyle = color;
    context.fillStyle = `${color}33`;
    context.lineWidth = Math.max(2, canvas.width / 300);
    context.beginPath();

    zone.points.forEach((point, pointIndex) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (pointIndex === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    if (zone.points.length >= 3) {
      context.closePath();
      context.fill();
    }
    context.stroke();

    if (isSelected) {
      zone.points.forEach((point) => drawHandle(point, color));
    }
  }

  function drawHandle(point, color) {
    context.beginPath();
    context.arc(point.x * canvas.width, point.y * canvas.height, 7, 0, Math.PI * 2);
    context.fillStyle = "#fffdf7";
    context.fill();
    context.strokeStyle = color;
    context.stroke();
  }

  function findHandle(point) {
    const threshold = 14 / Math.min(canvas.width, canvas.height);
    for (let zoneIndex = nextZones.length - 1; zoneIndex >= 0; zoneIndex -= 1) {
      for (let pointIndex = 0; pointIndex < nextZones[zoneIndex].points.length; pointIndex += 1) {
        const zonePoint = nextZones[zoneIndex].points[pointIndex];
        if (Math.hypot(point.x - zonePoint.x, point.y - zonePoint.y) <= threshold) {
          return { pointIndex, zoneIndex };
        }
      }
    }
    return null;
  }

  function findZone(point) {
    for (let index = nextZones.length - 1; index >= 0; index -= 1) {
      if (isPointInPolygon(point, nextZones[index].points)) {
        return index;
      }
    }
    return -1;
  }

  function getNormalizedPoint(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    };
  }

  return {
    addZone,
    deleteSelectedZone,
    destroy,
    getState,
    removeLastPoint,
    render,
    setSelectedZone,
    setSelectedZoneType,
  };
}

function normalizeZones(zones) {
  const safeZones = Array.isArray(zones) ? zones : [];
  const normalizedZones = safeZones.map((zone) => ({
    type: normalizeType(zone?.type),
    points: Array.isArray(zone?.points)
      ? zone.points.map(normalizePoint).filter(Boolean)
      : [],
  }));
  return normalizedZones.length > 0 ? normalizedZones : [{ type: "main", points: [] }];
}

function normalizePoint(point) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
    return null;
  }
  return { x: clamp(point.x), y: clamp(point.y) };
}

function normalizeType(type) {
  return ZONE_TYPES.has(type) ? type : "normal";
}

function getZoneColor(type) {
  if (type === "main") {
    return "#d85d35";
  }
  if (type === "secondary") {
    return "#2e7892";
  }
  return "#213430";
}

function isPointInPolygon(point, points) {
  if (points.length < 3) {
    return false;
  }

  let isInside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const currentPoint = points[index];
    const previousPoint = points[previous];
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

function clamp(value) {
  return Math.min(1, Math.max(0, value));
}

function clampIndex(index, length) {
  return Math.min(Math.max(0, Number(index) || 0), Math.max(0, length - 1));
}
