#!/usr/bin/env node

const decon = require('../index.js')
const url = require('url')
const die = function (msg, errCode) {
  console.error('ERROR:' + msg)
  process.exit(errCode)
}
const syntax =
`Syntax:
--url/-u                            CouchDB URL                                             (required)
--batch/-b                          The batch size of deletions to perform in one HTTP call (default: 100)
--keep/-k                           Keep this revision
--verbose/-v                        Show running commentary                                 (default: true)
--dryrun/-d                         Output what would be done without actually doing it     (default: false)
`
const { parseArgs } = require('node:util')
const argv = process.argv.slice(2)
const options = {
  url: {
    type: 'string',
    short: 'u'
  },
  batch: {
    type: 'string',
    short: 'b',
    default: '100'
  },
  keep: {
    type: 'string',
    short: 'k'
  },
  verbose: {
    type: 'boolean',
    short: 'v',
    default: true
  },
  dryrun: {
    type: 'boolean',
    short: 'd',
    default: false
  },
  help: {
    type: 'boolean',
    short: 'h',
    default: false
  }
}

// parse command-line options
const { values } = parseArgs({ argv, options })

// help mode
if (values.help) {
  console.log(syntax)
  process.exit(0)
}

// parse batch size
values.batch = parseInt(values.batch)

// parse and check the url
const parsed = new url.URL(values.url)
if (!parsed.protocol) {
  die('url is not valid HTTP/HTTPS URL', 1)
}
const slashes = parsed.pathname.match(/\//g)
if (!slashes || slashes.length !== 2) {
  die('url must contain path to document e.g. http://localhost:5984/mydb/mydoc', 2)
}

// deconflict the document
decon(values).then((data) => {
  console.log(data + ' conflicts deleted')
}).catch((e) => {
  console.log(e.message)
  process.exit(1)
})
