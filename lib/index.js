'use strict'
const http = require('http')
const pckg = require('../package.json')
const zlib = require('zlib')
const info = pckg.name + ' ' + pckg.version
module.exports = function start (state, port, interval, filter, cacheMaxAge) {
  console.log(info, '// port', port)
  if (cacheMaxAge === void 0) { cacheMaxAge = 0 }
  if (!interval) { interval = 500 }
  var status = `${info} started ${new Date()}`
  var inProgress = false
  var result = {}
  var listeners = []
  var changeDateObj
  var changeDateStr

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

  state.subscribe({ val: true }, () => {
    // NOTE: this is double new Date is needed, strangely.
    changeDateStr = new Date().toUTCString()
    changeDateObj = new Date(changeDateStr)
    process()
  })

  return http.createServer((req, res) => {
    const url = req.url
    if (url === '/') {
      const sendResponse = isNotModified(req, changeDateObj)
        ? sendNotModified
        : sendData
      req.on('data', doNothing)
      req.on('end', () => { sendResponse(req, res) })
    } else if (url === '/status') {
      res.end(status)
    } else {
      res.end()
    }
  }).listen(port)

  function sendNotModified (req, res) {
    res.writeHead(304, 'Not Modified')
    res.end()
  }

  function sendData (req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Cache-Control', 'public, max-age=' + cacheMaxAge)
    res.setHeader('Last-Modified', changeDateStr)

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
}

function isNotModified (req, modStampObj) {
  if (modStampObj) {
    let since = req.headers['if-modified-since']
    if (since) {
      since = new Date(since)
      return since.getTime() === modStampObj.getTime()
    }
  }
}

function doNothing () {}

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
