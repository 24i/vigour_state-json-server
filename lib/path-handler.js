'use strict'

const set = require('lodash.set')
const urlTool = require('url')
const querystring = require('querystring')

exports.handle = handlePath
exports.parse = parse

function handlePath (state, url, filter) {
  url = urlTool.parse(url)
  const path = url.pathname.slice(1).split('/')
  const query = querystring.parse(url.query)
  const start = state.get(path)
  const serialized = start && (!filter || filter(start))
    ? parse(start, query.depth, filter)
    : null
  return JSON.stringify(serialized)
}

function parse (state, depth, filter, result, target) {
  const nextDepth = depth && depth - 1
  if (!result) {
    result = {}
  }
  if (!target) {
    /* starting from a fresh path */
    const path = state.path()
    if ('val' in state) { /* endpoint is a primitive */
      let val = state.val
      let sendVal
      if (val && val.isBase) {
        parse(val, depth, filter, result)
        sendVal = '$root.' + val.path().join('.')
      } else {
        sendVal = val
      }
      set(result, path, sendVal)
    } else { /* endpoint is an object */
      target = {}
      set(result, path, target)
      populate()
    }
  } else {
    populate()
  }
  return result
  function populate () {
    state.each((p, key) => {
      if (!filter || filter(p)) {
        if ('val' in p) {
          let val = p.val
          let sendVal
          if (val && val.isBase) {
            parse(val, nextDepth, filter, result)
            sendVal = '$root.' + val.path().join('.')
          } else {
            sendVal = val
          }
          target[key] = sendVal
        } else if (depth - 1 !== 0) {
          let nextTarget = (target[key] = {})
          parse(p, nextDepth, filter, result, nextTarget)
        }
      }
    })
  }
}
