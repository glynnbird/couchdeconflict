# couchdeconflict

A command-line utility to remove conflicts from Apache CouchDB or IBM Cloudant documents. It works by fetching the document to be treated and then deleting all of the non-winning revisions with futher bulk API calls. You may choose the revision you wish to keep if the current winning revision isn't your chosen winner.

This tool is designed to "fix" a document that contains multiple conflicts using the *brute force* method of deleting all but one revision. This method results in the loss of data - you may wish to examine the bodies of the conflicting revisions before using this tool.

## Installation

The package is installed using npm. [Node.js required](https://nodejs.org/en/download/):

```sh
npm install -g couchdeconflict
```

## Running

If you have a the URL of the document that needs deconflicting, simply pass that to `couchdeconflict` as the `-u`/`--url` parameter:

```sh
> couchdeconflict -u http://localhost:5984/mydb/mydoc
couchdeconflict
---------------
options: {"url":"http://localhost:5984/mydb/mydoc","keep":null,"batch":100}
Fetching document
217 conflicts
  [==================================================] 100% 217/217           
217 conflicts deleted
```

You may also supply a URL with credentials e.g. `https://U:P@host.cloudant.com/mydb/mydoc`.

If you wish to keep a revision other than the current winning revision, simply pass the revision token as a `-k`/`--keep` parameter:

```sh
> couchdeconflict --url http://localhost:5984/mydb/mydoc  --keep 1-111
couchdeconflict
---------------
options: {"url":"http://###:###@localhost:5984/mydb/mydoc","keep":"1-111","batch":100}
Fetching document
217 conflicts
Keeping revision 1-111
  [==================================================] 100% 217/217           
217 conflicts deleted
```

Deletions are processed in batches of 100, although this can be overridden with the `-b`/`--batch` parameter.

## Parameter Reference

* `-u`/`--url` (required) - the URL of the document to treat e.g. `https://U:P@host.cloudant.com/mydb/mydoc` or `http://localhost:5984/mydb/mydoc`
* `-k`/`--keep` - the revision token that is to be left as the winner at the end of the process. If not supplied, the current winning revision is chosen.
* `-b`/`--batch` - the number of deletions processed per API call. Defaults to 100.
* `-d`/`--dryrun` - output the revisions that *would* be deleted, but don't actually delete them.
* `-v`/`--verbose` - display verbose output. Default to true
* `--help` - display help
* `--version` - display current version

## Using programmatically

You may use this library in your own Node.js code:

```js
var decon = require('couchdeconflict')
var opts = {
  url: 'http://localhost:5984/mydb/mydoc'
}
decon(opts).then((data) => {
  console.log('Done', data)
})
```

## What are conflicts?

This is discussed in more detail in this [three](https://developer.ibm.com/dwblog/2015/cloudant-document-conflicts-one/) [part](https://developer.ibm.com/dwblog/2015/cloudant-document-conflicts-two/) [blog](https://developer.ibm.com/dwblog/2015/cloudant-document-conflicts-three/) series, but essentially they occur when the same document is written to in different ways in separate copies of the database. This can occur when there is:

- a mobile app and a server-side replica.
- two databases that are replicated together.
- a single, multi-node database that has mulitple writes to the same document at the same time.

Conflicts are not an error condition - it's just the database's way of preventing you from losing data. It is your app's responsibility to resolve them.

This tool provides a simplistic solution to fix documents that have become conflicted and need all but one revision deleting. A document with two many conflicts can cause performance problems for a database, so it's good practice to resolve them.

## Making conflicts 

The easiest way to create a conflicted document is to write multiple revisions with `new_edits: false` using the `POST /db/_bulk_docs` method:

```sh
# Your CouchDB/Cloudant URL goes here
URL='http://localhost:5984/mydb'
# Create the database
curl -X PUT "$URL"
# JSON to create multiple revisons of the same document
JSON='{"new_edits":false,"docs":[{"_id":"mydoc","_rev":"1-1","a":0},{"_id":"mydoc","_rev":"1-2","a":1},{"_id":"mydoc","_rev":"1-3","a":2}]}'
# Make _bulk_docs request
curl -v -X POST -H 'Content-type:application/json' -d "$JSON" "$URL/_bulk_docs"
```

## Further reading

- [CouchDB docs](http://docs.couchdb.org/en/2.1.1/replication/conflicts.html?highlight=conflict)
- [The tree behind Cloudant's documents](https://dx13.co.uk/articles/2017/1/1/the-tree-behind-cloudants-documents-and-how-to-use-it.html)
