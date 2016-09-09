'use strict'

const s = require('vigour-state/s')
const createServer = require('../')
const port = 9000

const state = s({
  data: true
})

createServer(state, port)
console.log('beng server', port)

const Repl = require('repl')
const repl = module.exports = Repl.start({ prompt: '> ', useGlobal: true })
const context = repl.context

context.state = state

Object.defineProperty(context, 'q', {
  get: function () { process.exit() },
  configurable: true
})
