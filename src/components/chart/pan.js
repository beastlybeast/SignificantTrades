/**
 * Highstock plugin for moving the chart using righ mouse button.
 *
 * Author: Roland Banguiran
 * Email: banguiran@gmail.com
 *
 */

// JSLint options:
/*global Highcharts, document */

import store from '../../services/store'

const enablePanning = (H, chart) => {
  'use strict'

  var addEvent = H.addEvent,
    fireEvent = H.fireEvent,
    doc = document,
    body = doc.body

  console.info('[pan.js] initialize')

  var options = chart.options,
    panning = options.chart.panning || true,
    zoomType = options.chart.zoomType || '',
    container = chart.container,
    xAxis = chart.xAxis[0],
    yAxis = chart.yAxis[0],
    downXPixels,
    downXValue,
    downYPixels,
    downYValue,
    isDragging = false,
    hasDragged = 0

  var _event

  if (panning && zoomType === '') {
    addEvent(container, 'mousedown', beforePan)
    addEvent(doc, 'mousemove', (e) => (_event = e))
    addEvent(doc, 'mouseup', afterPan)
  }

  function beforePan(e) {
    body.style.cursor = 'move'

    downYPixels = chart.pointer.normalize(e).chartY
    downYValue = yAxis.toValue(downYPixels)

    downXPixels = chart.pointer.normalize(e).chartX
    downXValue = xAxis.toValue(downXPixels)

    isDragging = true

    fireEvent(chart, '_panStart')

    smoothPan()
  }

  function afterPan(e) {
    if (isDragging) {
      isDragging = false

      body.style.cursor = ''

      fireEvent(chart, '_panEnd')
    }
  }

  function doPan(e) {
    if (isDragging) {
      var dragYPixels = chart.pointer.normalize(e).chartY,
        dragYValue = yAxis.toValue(dragYPixels)

      if (!store.state.chartAutoScale) {
        var yExtremes = yAxis.getExtremes(),
          yUserMin = yExtremes.userMin,
          yUserMax = yExtremes.userMax,
          yDataMin = yExtremes.dataMin,
          yDataMax = yExtremes.dataMax,
          yMin =
            yUserMin !== undefined && yUserMin !== null ? yUserMin : yDataMin,
          yMax =
            yUserMax !== undefined && yUserMax !== null ? yUserMax : yDataMax,
          newMinY,
          newMaxY
      }

      var dragXPixels = chart.pointer.normalize(e).chartX,
        dragXValue = xAxis.toValue(dragXPixels),
        xExtremes = xAxis.getExtremes(),
        xUserMin = xExtremes.userMin,
        xUserMax = xExtremes.userMax,
        xDataMin = xExtremes.dataMin,
        xDataMax = xExtremes.dataMax,
        xMin =
          xUserMin !== undefined && xUserMin !== null ? xUserMin : xDataMin,
        xMax =
          xUserMax !== undefined && xUserMax !== null ? xUserMax : xDataMax,
        newMinX,
        newMaxX

      // determine if the mouse has moved more than 10px
      hasDragged = Math.max(
        Math.abs(downYPixels - dragYPixels),
        Math.abs(downXPixels - dragXPixels)
      )

      if (hasDragged > 2) {
        if (!store.state.chartAutoScale) {
          newMinY = yMin - (dragYValue - downYValue)
          newMaxY = yMax - (dragYValue - downYValue)
          yAxis.setExtremes(newMinY, newMaxY, false, false)
        }

        newMinX = xMin - (dragXValue - downXValue)
        newMaxX = xMax - (dragXValue - downXValue)
        xAxis.setExtremes(newMinX, newMaxX, true, false)

        fireEvent(chart, '_pan')
      }
    }
  }

  function smoothPan() {
    if (!isDragging) {
      return
    }

    if (_event) {
      doPan(_event)

      _event = null
    }

    return requestAnimationFrame(smoothPan)
  }
}

export default enablePanning
