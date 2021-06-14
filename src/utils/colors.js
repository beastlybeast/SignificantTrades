export const PALETTE = [
  '#F44336',
  '#FF9800',
  '#ffeb3b',
  '#4caf50',
  '#009688',
  '#00bcd4',
  '#2196F3',
  '#673ab7',
  '#9c27b0',
  '#e91e63',
  '#FFCDD2',
  '#FFE0B2',
  '#FFF9C4',
  '#C8E6C9',
  '#B2DFDB',
  '#B2EBF2',
  '#BBDEFB',
  '#D1C4E9',
  '#E1BEE7',
  '#F8BBD0',
  '#ef9a9a',
  '#FFCC80',
  '#FFF59D',
  '#A5D6A7',
  '#80cbc4',
  '#80DEEA',
  '#90CAF9',
  '#B39DDB',
  '#CE93D8',
  '#f48fb1',
  '#E57373',
  '#ffb74d',
  '#FFF176',
  '#81c784',
  '#4db6ac',
  '#4dd0e1',
  '#64B5F6',
  '#9575cd',
  '#ba68c8',
  '#f06292',
  '#EF5350',
  '#FFA726',
  '#ffee58',
  '#66BB6A',
  '#26a69a',
  '#26c6da',
  '#42A5F5',
  '#7e57c2',
  '#ab47bc',
  '#ec407a',
  '#D32F2F',
  '#F57C00',
  '#fbc02d',
  '#388e3c',
  '#00796b',
  '#0097A7',
  '#1976D2',
  '#512da8',
  '#7b1fa2',
  '#C2185B',
  '#B71C1C',
  '#e65100',
  '#F57F17',
  '#1B5E20',
  '#004D40',
  '#006064',
  '#0d47a1',
  '#311B92',
  '#4A148C',
  '#880e4f'
]

export function getColor(except = []) {
  let color

  while (!color || except.indexOf(color) !== -1) {
    color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
  }

  return color
}

export function getColorByWeight(a, b, weight) {
  var p = weight
  var w = p * 2 - 1
  var w1 = (w / 1 + 1) / 2
  var w2 = 1 - w1
  var rgb = [Math.round(b[0] * w1 + a[0] * w2), Math.round(b[1] * w1 + a[1] * w2), Math.round(b[2] * w1 + a[2] * w2)]
  return rgb
}

window.getColorByWeight = getColorByWeight

export function rgbaToRgb(color, backgroundColor) {
  const alpha = 1 - color[3]

  color[0] = Math.round((color[3] * (color[0] / 255) + alpha * (backgroundColor[0] / 255)) * 255)
  color[1] = Math.round((color[3] * (color[1] / 255) + alpha * (backgroundColor[1] / 255)) * 255)
  color[2] = Math.round((color[3] * (color[2] / 255) + alpha * (backgroundColor[2] / 255)) * 255)
  color.splice(3, 1)

  return color
}

export function hexToRgb(hex) {
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b
  })

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null
}

export function getColorLuminance(color, backgroundColor) {
  if (typeof color[3] !== 'undefined' && backgroundColor) {
    color = rgbaToRgb(color, backgroundColor)
  }

  return Math.sqrt(color[0] * color[0] * 0.241 + color[1] * color[1] * 0.691 + color[2] * color[2] * 0.068)
}

export function splitRgba(string, backgroundColor) {
  const match = string.match(/rgba?\((\d+)[\s,]*(\d+)[\s,]*(\d+)(?:[\s,]*([\d.]+))?\)/)

  let color = [+match[1], +match[2], +match[3]]

  if (typeof match[4] !== 'undefined') {
    color.push(+match[4])

    if (backgroundColor) {
      color = rgbaToRgb(color, backgroundColor)
    }
  }

  return color
}

export function getAppBackgroundColor() {
  let color = getComputedStyle(document.getElementById('app')).backgroundColor

  if (color.indexOf('#') !== -1) {
    color = hexToRgb(color)
  } else {
    color = splitRgba(color)
  }

  return color
}

export function getLogShade(color, percent) {
  const r = Math.round
  const [a, b, c, d] = color
  var P = percent < 0
  var t = P ? 0 : percent * 255 ** 2
  P = P ? 1 + percent : 1 - percent
  return (
    'rgb' + (d ? 'a(' : '(') + r((P * a ** 2 + t) ** 0.5) + ',' + r((P * b ** 2 + t) ** 0.5) + ',' + r((P * c ** 2 + t) ** 0.5) + (d ? ',' + d : ')')
  )
}
