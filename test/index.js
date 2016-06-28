'use strict'
const test = require('tape')
const s = require('vigour-state/s')
const createServer = require('../')
const http = require('http')
const port = 8888 // use freeport more clean

test('server state', (t) => {
  const state = s({
    one: 'hello',
    two: 'bye!',
    nest: {
      a: {
        b: {
          c: 'c'
        }
      }
    }
  })
  const server = createServer(t, port)
  http.request({
    host: 'localhost',
    port: port,
    method: 'GET'
  }, (res) => {
    const str = ''
    res.on('data', (chunk) => { str += chunk })
    res.on('end', () => {
      console.log(JSON.parse(str))
      t.end() // more ofc
    })
  }).end()
})