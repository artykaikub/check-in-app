export type LatLngNode = {
  lat: number
  lng: number
}

export function isPointInsidePolygon(point: LatLngNode, polygon: LatLngNode[]) {
  let isInside = false

  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
    const currentNode = polygon[current]
    const previousNode = polygon[previous]

    if (!currentNode || !previousNode) {
      continue
    }

    const intersects =
      currentNode.lng > point.lng !== previousNode.lng > point.lng &&
      point.lat <
        ((previousNode.lat - currentNode.lat) * (point.lng - currentNode.lng)) /
          (previousNode.lng - currentNode.lng) +
          currentNode.lat

    if (intersects) {
      isInside = !isInside
    }
  }

  return isInside
}

export function getBangkokDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value)
}
