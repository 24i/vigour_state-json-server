'use strict'

const set = require('lodash.setwith')
const get = require('lodash.get')
const urlTool = require('url')
const querystring = require('querystring')

exports.handle = pathHandler
exports.parse = parse

function pathHandler (state, req, filter) {
  const url = urlTool.parse(req.url)
  const path = url.pathname.slice(1).split('/')
  const query = querystring.parse(url.query)
  const start = state.get(path)
  const serialized = start && (!filter || filter(start))
    ? parse(start, query.depth, filter)
    : null
  return JSON.stringify(serialized)
}

function parse (state, depth, filter, result, target) {
  if (!result) {
    result = {}
  }
  if (!state) { return result }
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
      set(result, path, sendVal, Object)
    } else { /* endpoint is an object */
      target = get(result, path) || {}
      set(result, path, target, Object)
      populate(state, depth, filter, result, target)
    }
  } else {
    populate(state, depth, filter, result, target)
  }
  return result
}

function populate (state, depth, filter, result, target) {
  const nextDepth = depth && depth - 1
  state.each((p, key) => {
    if (p && (!filter || filter(p))) {
      if (p.val !== void 0) {
        let val = p.val
        let sendVal
        if (val && val.isBase) {
          parse(val, depth, filter, result)
          sendVal = '$root.' + val.path().join('.')
        } else {
          sendVal = val
        }
        target[key] = sendVal
      } else if (depth - 1 !== 0) {
        let nextTarget = target[key] || (target[key] = {})
        parse(p, nextDepth, filter, result, nextTarget)
      }
    }
  })
}
