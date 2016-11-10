'use strict'
const s = require('vigour-state/s')
const createServer = require('../../')
const http = require('http')
const port = 8888 // use freeport more clean

var step = 0 // eslint-disable-line
const state = s()

const big = {}
for (let i = 0; i < 1e4; i++) {
  big['x' + i] = i
}

const server = createServer({ // eslint-disable-line
  state, port, filter: (prop) => prop.key !== 'secret'
})

function doRequest (fn) {
  http.request({
    host: 'localhost',
    port: port,
    method: 'GET'
  }, (res) => {
    res.on('end', fn)
  }).end()
}

var i = 1e6

function goloop () {
  i--
  if (i > 0) {
    doRequest(goloop)
  } else {
    console.log('super done')
  }
}

function info () {
  if (i > 0) {
    console.log('i:', i, 'mem:', (process.memoryUsage().heapTotal / 1e6).toFixed(2) + ' mb')
    setTimeout(info, 1e3)
  }
}

info()
goloop()

/*
node --expose-gc
> process.memoryUsage();
*/
