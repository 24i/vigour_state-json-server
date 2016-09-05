'use strict'
const http = require('http')
const pckg = require('../package.json')
const zlib = require('zlib')

module.exports = function start (state, port, interval, filter) {
  console.log(pckg.name + ' ' + pckg.version)
  if (!interval) { interval = 5e2 }
  var inProgress = false
  var result = {}
  var listeners = []

  const process = () => {
    if (!inProgress) {
      inProgress = setTimeout(() => {
        createResult(state, filter, result, () => {
          inProgress = false
          for (let i = 0, len = listeners.length; i < len; i++) {
            listeners[i]()
          }
          listeners = []
        })
      }, interval)
    }
  }

  state.subscribe({ val: true }, process)

  return http.createServer((req, res) => {
    var payload = ''
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.setHeader('Accept', '*/*')
    req.on('data', (data) => { payload += data })
    req.on('end', () => {
      if (!result.json) { process() }
      if (inProgress) {
        listeners.push(() => send(req, res, result))
      } else {
        send(req, res, result)
      }
    })
  }).listen(port)
}

function createResult (state, filter, result, done) {
  var cnt = 0
  result.json = JSON.stringify(state.serialize(false, filter), false, 2)
  zlib.deflate(result.json, (err, data) => {
    result.deflate = err ? result.json : data
    if (++cnt === 2) { done() }
  })
  zlib.gzip(result.json, (err, data) => {
    result.gzip = err ? result.json : data
    if (++cnt === 2) { done() }
  })
}

function send (req, res, result) {
  var acceptEncoding = req.headers['accept-encoding']
  var encoding = acceptEncoding && (
    acceptEncoding.match(/\bgzip\b/)
      ? 'gzip'
      : acceptEncoding.match(/\bdeflate\b/)
        ? 'deflate'
        : false
  )
  if (encoding) {
    res.setHeader('Content-Encoding', encoding)
    res.end(result[encoding])
  } else {
    res.end(result.json)
  }
}
