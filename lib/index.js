'use strict'
const http = require('http')
const pckg = require('../package.json')

module.exports = function start (state, port, interval, filter) {
  console.log(pckg.name + ' ' + pckg.version)
  if (!interval) { interval = 1e3 }
  var inProgress = false
  var json
  var listeners = []
  state.subscribe({ val: true }, () => {
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
    var payload = ''
    res.setHeader('Content-Type', 'text/plain')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.setHeader('Accept', '*/*')
    req.on('data', (data) => { payload += data })
    req.on('end', () => {
      if (!json) {
        json = JSON.stringify(state.serialize(false, filter), false, 2)
        inProgress = false
      }
      res.writeHead(200, 'OK')
      if (inProgress) {
        listeners.push(() => res.end(json))
      } else {
        res.end(json)
      }
    })
  }).listen(port)
}
