'use strict'

var http = require('http')
var urls = {
  local: 'http://10.0.2.2:9000/',
  ngrok: 'http://d4bf0602.ngrok.io',
  sbs: 'https://vier-json.vigour.io',
  now: 'https://vigour-iosbs-json-server-ibarnofoec.now.sh/'
}

doGet('local')
doGet('ngrok')
doGet('sbs')
doGet('now')

function doGet (endpoint) {
  var url = urls[endpoint]
  console.log('DO GET!', endpoint, url)
  var req = http.get(url, function (res) {
    console.log('GOT RESPONSE', endpoint)
    var data = ''
    res.on('data', function (chunk) {
      data += String(chunk)
    })
    res.on('end', function () {
      console.log('GOT DATA', data, endpoint)
    })
  })
  req.on('error', function (err) {
    console.log('ERROR!!', endpoint, url, '\n', err)
  })
}
