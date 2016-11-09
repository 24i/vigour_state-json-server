'use strict'

const http = require('http')
const querystring = require('querystring')
const urlTool = require('url')
const test = require('tape')
const State = require('vigour-state')
const createServer = require('../../')
const port = 8888 // use freeport more clean
const chalk = require('chalk')
const set = require('lodash.set')

test('server state', (t) => {
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
        ref: '$root.dat.deep.even'
      }
    }
  }
  const state = new State(setObj)
  const server = createServer({state, port, pathHandler})
  console.log('go do reqs!')
  //
  Promise.all([
    testRequest({
      path: '/undeep',
      depth: false,
      expected: {
        undeep: true
      }
    }),
    testRequest({
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
    testRequest({
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
    // testRequest({
    //   path: '/very/deep/ref',
    //   depth: false,
    //   expected: {
    //     ledeep: 'yes',
    //     deeper: {}
    //   }
    // })
  ])
  .catch(err => t.fail(err))
  .then(() => {
    console.log('tests done, closing server...')
    t.end()
    // server.close()
  })

  function testRequest ({path, depth, expected}) {
    return request(path, { depth })
      .then(res => {
        var data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          console.log(chalk.blue('!!!!!!!!!!!!!! GOT RESPENSE'))
          console.log(JSON.parse(data))
          try {
            data = JSON.parse(data)
            t.same(data, expected, `${path} gave correct response`)
          } catch (err) {
            t.fail(`${path} gave bad JSON response: ${err}`)
          }
        })
      })
  }
})

const request = (path, params) => new Promise((resolve, reject) => {
  http.request({
    host: 'localhost',
    port: port,
    path,
    query: params
  }, res => resolve(res))
  .on('error', err => reject(err))
  .end()
})

function pathHandler (state, url, filter) {
  console.log(chalk.red('URL'), url)
  url = urlTool.parse(url)
  const path = url.pathname.slice(1).split('/')
  const query = querystring.parse(url.query)
  const start = state.get(path)
  console.log('start', start)
  const serialized = start ? parse(start, query.depth, filter) : null
  console.log('pathHandler made', serialized)
  return JSON.stringify(serialized)
}

function parse (state, depth, filter, result, target) {
  console.log('PARSE', state)
  const nextDepth = depth && depth - 1
  if (!result) {
    result = {}
  }
  if (!target) {
    /* starting from a fresh path */
    const path = state.path()
    if ('val' in state) { /* endpoint is a primitive */
      console.log('>>> YES')
      let val = state.val
      let sendVal
      if (val && val.isBase) {
        parse(val, depth, filter, result)
        sendVal = '$root.' + val.path()
      } else {
        sendVal = val
      }
      set(result, path, sendVal)
    } else { /* endpoint is an object */
      target = {}
      set(result, path, target)
      populate()
    }
  } else {
    populate()
  }
  return result
  function populate () {
    state.each((p, key) => {
      if ('val' in p) {
        let val = p.val
        let sendVal
        if (val && val.isBase) {
          parse(val, nextDepth, filter, result)
          sendVal = '$root.' + val.path()
        } else {
          sendVal = val
        }
        target[key] = sendVal
      } else if (depth - 1 !== 0) {
        let nextTarget = (target[key] = {})
        parse(p, nextDepth, filter, result, nextTarget)
      }
    })
  }
}
