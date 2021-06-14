import '../../data/typedef'
import { formatTime } from '../../utils/helpers'

/**
 * @type Chunk[]
 */
export const cache = []

/**
 * @type Range
 */
export const cacheRange = { from: null, to: null }

/**
 * append or prepend chunk to cache array
 * and recalculate cacheRange
 * @param{Chunk} chunk Chunk to add
 */
export function saveChunk(chunk) {
  console.log(`[cache/saveChunk]`, formatTime(chunk.from), formatTime(chunk.to))

  let index

  if (!cache.length || cache[cache.length - 1].to <= chunk.from) {
    index = cache.push(chunk) - 1
  } else if (cache[0].from >= chunk.to) {
    cache.unshift(chunk)
    index = 0
  }

  if (index === 0) {
    cacheRange.from = chunk.from
  }

  if (index === cache.length - 1) {
    cacheRange.to = chunk.to
  }

  if (typeof index !== 'undefined') {
    console.log(`[saveChunk] new cache range`, formatTime(cacheRange.from), ' -> ', formatTime(cacheRange.to))

    return chunk
  } else {
    console.log(
      `[saveChunk] couldn't save chunk\n\t`,
      '- cachedRange [from: ' + formatTime(cacheRange.from),
      ' -> to: ',
      formatTime(cacheRange.to) + ']\n\t',
      '- chunk range [from: ' + formatTime(chunk.from),
      ' -> to: ',
      formatTime(chunk.to) + ']'
    )
    debugger
  }
}

export function clearCache() {
  console.log(`[chart/cache] clear cache`)

  cache.splice(0, cache.length)
  cacheRange.from = cacheRange.to = null
}
