'use strict'
const createServer = require('../')
const freeport = require('freeport')

const s = require('vigour-state/s')
const state = s({ example: true })
setInterval(() => state.set({ rnd: Math.random() }), 10e3)

freeport((err, port) => {
  if (err) { throw err }
  port = 32977
  console.log('listening on port', port)
  createServer(state, port, false, false, 31536000)
})
