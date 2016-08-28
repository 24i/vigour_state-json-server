'use strict'
const http = require('http')
const pckg = require('../package.json')

module.exports = function start (state, port, interval, filter, cacheMaxAge) {
  console.log(pckg.name + ' ' + pckg.version)
  if (cacheMaxAge === void 0) { cacheMaxAge = 0 }
  if (!interval) { interval = 1e3 }
  var inProgress = false
  var json
  var listeners = []
  var modStampStr
  var modStampObj

  state.subscribe({ val: true }, () => {
    modStampStr = new Date().toUTCString()
    modStampObj = new Date(modStampStr)

    if (!inProgress && json) {
      inProgress = setTimeout(() => {
        json = JSON.stringify(state.serialize(false, filter), false, 2)
        inProgress = false
        for (let i = 0, len = listeners.length; i < len; i++) {
          listeners[i]()
        }
        listeners = []
      }, interval)
    }
  })
  return http.createServer((req, res) => {
    const sendResponse = isNotModified(req, modStampObj)
      ? sendNotModified
      : sendJSON

    req.on('data', doNothing)
    req.on('end', sendResponse)

    function sendNotModified () {
      res.writeHead(304, 'Not Modified')
      res.end()
    }

    function sendJSON () {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET')
      res.setHeader('Cache-Control', 'public, max-age=' + cacheMaxAge)
      res.setHeader('Last-Modified', modStampStr)
      res.writeHead(200, 'OK')

      if (!json) {
        json = JSON.stringify(state.serialize(false, filter), false, 2)
        inProgress = false
      }

      if (inProgress) {
        listeners.push(() => res.end(json))
      } else {
        res.end(json)
      }
    }
  }).listen(port)
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
