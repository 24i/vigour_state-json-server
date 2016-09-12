'use strict'
const http = require('http')
const pckg = require('../package.json')
const zlib = require('zlib')
const info = pckg.name + ' ' + pckg.version
const log = {}
module.exports = function start (state, port, interval, filter, cacheMaxAge, logLabel) {
  console.log(info, '// port', port, 'logging', log)
  if (logLabel === true) {
    log.io = true
    log.process = true
  } else if (logLabel) {
    log[logLabel] = true
  }
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
        if (log.process) {
          console.log(`[${pckg.name}] create result...`)
        }
        createResult(state, filter, result, () => {
          if (log.process) {
            console.log(`[${pckg.name}] created result!`)
          }
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
    req.on('data', doNothing)
    if (url === '/') {
      if (log.io) {
        console.log(`[${pckg.name}] incoming data request!`)
      }
      req.on('end', () => {
        if (log.io) {
          console.log(`[${pckg.name}] req end!`)
        }
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
    if (log.io) {
      console.log(`[${pckg.name}] send data!`)
    }
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
    if (log.io) {
      console.log(`[${pckg.name}] sent the data!`)
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
