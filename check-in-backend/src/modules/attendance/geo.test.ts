import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getBangkokDate, isPointInsidePolygon } from './geo.js'

describe('attendance geo helpers', () => {
  const polygon = [
    { lat: 13.758, lng: 100.527 },
    { lat: 13.758, lng: 100.532 },
    { lat: 13.754, lng: 100.532 },
    { lat: 13.754, lng: 100.527 }
  ]

  it('accepts a point inside a four-node work area', () => {
    assert.equal(isPointInsidePolygon({ lat: 13.756, lng: 100.529 }, polygon), true)
  })

  it('rejects a point outside a four-node work area', () => {
    assert.equal(isPointInsidePolygon({ lat: 13.762, lng: 100.529 }, polygon), false)
  })

  it('formats work dates in Asia/Bangkok', () => {
    const date = new Date('2026-06-04T18:30:00.000Z')

    assert.equal(getBangkokDate(date), '2026-06-05')
  })
})
