'use strict'
const test = require('tape')
const s = require('vigour-state/s')
const createServer = require('../')
const http = require('http')
const port = 8888 // use freeport more clean

test('server state', (t) => {
  var step = 0
  const state = s()

  const results = [
    { nest: { a: { b: { c: 'c' } } } },
    { nest: { a: { b: { c: 'd' } } }, x: true }
  ]

  const input = [
    () => state.set({
      nest: {
        a: {
          b: {
            c: 'c'
          }
        }
      }
    }),
    () => {
      const c = state.nest.a.b.c
      c.set('e')
      setTimeout(() => c.set('f'))
      setTimeout(() => c.set('d'), 50)
      setTimeout(() => state.set({ x: true }), 100)
    }
  ]

  t.plan(results.length)

  const server = createServer(state, port)

  input[step]()

  function doRequest () {
    http.request({
      host: 'localhost',
      port: port,
      method: 'GET'
    }, (res) => {
      var str = ''
      res.on('data', (chunk) => { str += chunk })
      res.on('end', () => {
        t.same(JSON.parse(str), results[step], 'correct respone case:' + step)
        if (step !== input.length - 1) {
          step++
          input[step]()
          doRequest()
        } else {
          server.close()
        }
      })
    }).end()
  }
  doRequest()
})
