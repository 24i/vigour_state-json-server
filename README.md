# vigour-state-json-server
<!-- VDOC.badges travis; standard; npm; coveralls -->
<!-- DON'T EDIT THIS SECTION (including comments), INSTEAD RE-RUN `vdoc` TO UPDATE -->
[![Build Status](https://travis-ci.org/vigour-io/state-json-server.svg?branch=master)](https://travis-ci.org/vigour-io/state-json-server)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)
[![npm version](https://badge.fury.io/js/vigour-state-json-server.svg)](https://badge.fury.io/js/vigour-state-json-server)
[![Coverage Status](https://coveralls.io/repos/github/vigour-io/state-json-server/badge.svg?branch=master)](https://coveralls.io/github/vigour-io/state-json-server?branch=master)

<!-- VDOC END -->

```javascript
  const createServer = require('vigour-state-json-server')
  const s = require('vigour-state/s')
  const state = s({ hello: 'world' })
  const http = require('http')
  // state, port, queuing-interval
  const server = createServer(state, 8080, 100)

  //example request
  http.request({
    host: 'localhost',
    port: 8080
  }, (res) => {
    var data = ''
    res.on('data', (chunk) => { data += chunk })
    res.on('end', () => {
      console.log(JSON.parse(data)) → { hello: 'world' }
    })
  }).end()
```