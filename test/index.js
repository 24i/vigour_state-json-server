'use strict'
const test = require('tape')
const s = require('vigour-state/s')
const createServer = require('../')
const http = require('http')
const port = 8888 // use freeport more clean

test('server state', (t) => {
  var step = 0
  const state = s()

  const big = {}
  for (let i = 0; i < 1e4; i++) {
    big['x' + i] = i
  }

  const results = [
    { big, nest: { a: { b: { c: 'c' } } } },
    { big, nest: { a: { b: { c: 'd' } } }, x: true }
  ]

  const input = [
    () => state.set({
      big,
      nest: {
        a: {
          b: {
            c: 'c',
            secret: 'hello'
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

  const server = createServer(
    state,
    port,
    false, (prop) => prop.key !== 'secret'
  )

  input[step]()

  function doRequest () {
    http.request({
      host: 'localhost',
      port: port,
      method: 'GET'
    }, (res) => {
      var str = ''
      res.on('data', (chunk) => { str += chunk.toString() })
      res.on('end', () => {
        console.log('got data?', str)
        t.same(JSON.parse(str), results[step], 'correct respone case:' + step)
        if (step !== input.length - 1) {
          step++
          input[step]()
          doRequest()
        } else {
          server.close()
        }
      })
    }).on('error', (err) => {
      t.fail('REQUEST ERROR!' + err)
    }).end()
  }
  doRequest()
})
