'use strict'

const s = require('vigour-state/s')
const createServer = require('../')
const port = 9000

const state = s({
  data: true
})

createServer(state, port)
console.log('beng server', port)
