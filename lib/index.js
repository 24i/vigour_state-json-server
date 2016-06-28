'use strict'
const vstamp = require('vigour-stamp')
const http = require('http')
const pckg = require('../package.json')

module.exports = function start (state, port, interval) {
  console.log(pckg.name + ' ' + pckg.version)
  if (!interval) { interval = 1e3 }
  var inProgress = false
  var json
  state.subscribe({ val: true }, () => {
    if (!inProgress && json) {
      inProgress = setTimeout(() => {
        json = JSON.stringify(state.serialize(), false, 2)
        inProgress = false
      }, interval)
      console.log('something changed')
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
        json = JSON.stringify(state.serialize(), false, 2)
        inProgress = false
      }
      res.writeHead(200, 'OK')
      res.end(json)
    })
  }).listen(port)
}
