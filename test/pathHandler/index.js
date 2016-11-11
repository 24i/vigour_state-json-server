'use strict'

const http = require('http')
const querystring = require('querystring')
// const urlTool = require('url')
const test = require('tape')
const State = require('vigour-state')
const port = 8888 // use freeport more clean
// const set = require('lodash.set')

const createServer = require('../../')
const pathHandler = require('../../path-handler').handle

test('pathHandler - get paths by depth over refs', (t) => {
  const setObj = {
    undeep: true,
    other: {
      deep: {
        thang: 'other deep val'
      }
    },
    dat: {
      deep: {
        thang: 'dat deep val',
        ref: '$root.undeep',
        deepref: '$root.other.deep.thang',
        even: {
          ledeep: 'yes',
          deeper: {
            thang: 'deepes'
          }
        }
      }
    },
    very: {
      deep: {
        ref: '$root.dat.deep'
      }
    }
  }
  const state = new State(setObj)
  const server = createServer({state, port, pathHandler})

  Promise.all([
    testRequest(t, {
      path: '/undeep',
      depth: false,
      expected: {
        undeep: true
      }
    }),
    testRequest(t, {
      path: '/dat/deep/even',
      depth: false,
      expected: {
        dat: {
          deep: {
            even: {
              ledeep: 'yes',
              deeper: {
                thang: 'deepes'
              }
            }
          }
        }
      }
    }),
    testRequest(t, {
      path: '/dat/deep/even',
      depth: 1,
      expected: {
        dat: {
          deep: {
            even: {
              ledeep: 'yes'
            }
          }
        }
      }
    }),
    testRequest(t, {
      path: '/very/deep/ref',
      depth: false,
      expected: setObj
    }),
    testRequest(t, {
      path: '/does/not/exist',
      depth: false,
      expected: null
    })
  ])
  .catch(err => t.fail(err))
  .then(() => {
    server.close()
    t.end()
  })
})

test('pathHandler - respect filter', (t) => {
  const state = new State({
    slerp: {
      dingus: {
        slebbes: {
          sync: false,
          wex: true
        },
        slats: 'murk'
      },
      fade: {
        sheks: '$root.slerp.dingus'
      }
    }
  })
  const server = createServer({
    state,
    port,
    pathHandler,
    filter: prop => !('sync' in prop) || prop.sync.compute()
  })

  testRequest(t, {
    path: '/slerp/dingus',
    depth: false,
    expected: {
      slerp: {
        dingus: {
          slats: 'murk'
        }
      }
    }
  })
  .catch(err => t.fail(err))
  .then(() => {
    server.close()
    t.end()
  })
})

test('pathHandler - invalidate cache', (t) => {
  const state = new State({
    slerp: 'smerk'
  })
  const server = createServer({ state, port, pathHandler })

  testRequest(t, {
    path: '/slerp',
    depth: false,
    expected: {
      slerp: 'smerk'
    }
  })
  .then(() => {
    state.set({ slerp: 'shwept' })
  })
  .then(() => testRequest(t, {
    path: '/slerp',
    depth: false,
    expected: {
      slerp: 'shwept'
    }
  }))
  .catch(err => t.fail(err))
  .then(() => {
    server.close()
    t.end()
  })
})

function testRequest (t, {path, depth, expected}) {
  return request(path, { depth })
    .then(res => new Promise(resolve => {
      var data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => {
        try {
          data = JSON.parse(data)
          t.same(data, expected, `${path} depth ${depth} gave correct response`)
        } catch (err) {
          t.fail(`${path} gave bad JSON response: ${err}`)
        }
        resolve()
      })
    }))
}

const request = (path, params) => new Promise((resolve, reject) => {
  http.request({
    host: 'localhost',
    port: port,
    path: `${path}?${querystring.stringify(params)}`
  }, res => resolve(res))
  .on('error', err => reject(err))
  .end()
})
