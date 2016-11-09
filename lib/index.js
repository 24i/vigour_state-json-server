'use strict'
const http = require('http')
const pckg = require('../package.json')
const zlib = require('zlib')
const info = pckg.name + ' ' + pckg.version

module.exports = function start ({state, port, interval, filter, cacheMaxAge, pathHandler}) {
  console.log(info, '// port', port, '// pathHandler', !!pathHandler)
  if (isNaN(cacheMaxAge)) {
    cacheMaxAge = 0
  } else {
    cacheMaxAge = Number(cacheMaxAge)
  }
  if (!interval) { interval = 500 }
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
    console.log('LOL GOT REQUEST!', url, req.query)
    req.on('data', doNothing)
    if (url === '/') {
      req.on('end', () => {
        if (isNotModified(req, changeDateObj)) {
          sendNotModified(req, res)
        } else {
          if (!result.json) { process() }
          if (inProgress) {
            listeners.push(() => sendData(req, res))
          } else {
            sendData(req, res)
          }
        }
      })
    } else if (pathHandler) {
      console.log('yes is pathHandler time')
      if (!result.paths) {
        result.paths = {}
      }
      var cached = result.paths[url]
      if (!cached) {
        cached = result.paths[url] = encode(pathHandler(state, url, filter))
      }
      sendData(req, res, url)
    } else {
      res.end()
    }
  }).listen(port)

  function sendNotModified (req, res) {
    res.writeHead(304, 'Not Modified')
    res.end()
  }

  function sendData (req, res, path) {
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
    var data
    if (encoding) {
      res.setHeader('Content-Encoding', encoding)
      data = path ? result.paths[path][encoding] : result[encoding]
    } else {
      data = path ? result.paths[path].json : result.json
    }
    console.log('SENDING DAT!')
    res.end(data)
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
  result.json = JSON.stringify(state.serialize(false, filter))
  zlib.deflate(result.json, (err, data) => {
    result.deflate = err ? result.json : data
    if (++cnt === 2) { done() }
  })
  zlib.gzip(result.json, (err, data) => {
    result.gzip = err ? result.json : data
    if (++cnt === 2) { done() }
  })
}

function encode (val) {
  console.log('lol encode it', val)
  return {
    json: val,
    gzip: zlib.gzipSync(val),
    deflate: zlib.deflateSync(val)
  }
}
