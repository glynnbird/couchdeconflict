#!/usr/bin/env node

var decon = require('../index.js')
var url = require('url')

var die = function (msg, errCode) {
  console.error('ERROR:' + msg)
  process.exit(errCode)
}
// get command-line arguements
var argv = require('yargs')
  .option('url', { alias: 'u', describe: 'CouchDB URL of document to change e.g. http://localhost:5984/mydb/mydoc', demandOption: true })
  .option('batch', { alias: 'b', describe: 'The batch size of deletions to perform in one HTTP call', demandOption: false, default: 100 })
  .option('keep', { alias: 'k', describe: 'Keep this revision', demandOption: false, default: null })
  .option('verbose', { alias: 'v', describe: 'Show running commentary', demandOption: false, default: true })
  .option('dryrun', { alias: 'd', describe: 'Output what would be done without actually doing it', demandOption: false, default: false })
  .help('help')
  .argv

// parse and check the url
var parsed = new url.URL(argv.url)
if (!parsed.protocol) {
  die('url is not valid HTTP/HTTPS URL', 1)
}
var slashes = parsed.pathname.match(/\//g)
if (!slashes || slashes.length !== 2) {
  die('url must contain path to document e.g. http://localhost:5984/mydb/mydoc', 2)
}

// deconflict the document
decon(argv).then((data) => {
  console.log(data + ' conflicts deleted')
}).catch((e) => {
  console.log(e.message)
  process.exit(-1)
})
