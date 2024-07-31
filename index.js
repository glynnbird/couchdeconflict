const ccurllib = require('ccurllib')
const headers = {}

// fetch the document in question.
const getDoc = async (url) => {
  const req = {
    method: 'get',
    url,
    headers,
    qs: { conflicts: true }
  }
  return ccurllib.request(req)
}

// opts - { url: '' , keep: '', batch: 100, verbose: false, deletions: [] }
const processDeletions = async (opts) => {
  const deletionAim = opts.deletions.length
  let deletionCount = 0
  const progress = function (x, y) {
    const percent = 100 * x / y
    const charCount = Math.floor(percent / 2)
    const p = '[' + '='.repeat(charCount) + '-'.repeat(50 - charCount) + ']'
    process.stdout.write('  ' + p + ' ' + Math.floor(percent) + '% ' + x + '/' + y + '           \r')
  }
  let done = false
  do {
    const b = opts.deletions.splice(0, opts.batch)
    if (b.length > 0) {
      if (opts.dryrun) {
        for (const doc of b) {
          console.log('DELETE ' + JSON.stringify(doc))
        }
      } else {
        const r = {
          method: 'post',
          url: opts.url.replace(/\/[^/]+$/, '/_bulk_docs'),
          headers,
          data: { docs: b }
        }
        await ccurllib.request(r)
        deletionCount += b.length
        if (opts.verbose) {
          progress(deletionCount, deletionAim)
        }
      }
    } else {
      done = true
    }
  } while (!done)
  console.log('\n')
  return deletionCount
}

// opts - { url: '' , keep: '', batch: 100, verbose: false }
const decon = async (opts) => {
  let doc = null
  const deletions = []
  let found = false

  // defaults
  if (typeof opts.batch === 'undefined') {
    opts.batch = 100
  }
  if (typeof opts.verbose === 'undefined') {
    opts.verbose = false
  }
  if (typeof opts.keep === 'undefined') {
    opts.keep = null
  }
  if (typeof opts.keep === 'undefined') {
    opts.dryrun = false
  }

  // fetch the document with list of conflicts
  if (opts.verbose) {
    console.log('couchdeconflict')
    console.log('---------------')
    console.log('options: ' + JSON.stringify({ url: opts.url.replace(/\/\/(.*)@/, '//###:###@'), keep: opts.keep, batch: opts.batch }))
    console.log('Fetching document')
  }
  doc = await getDoc(opts.url)
  if (doc.status >= 400) {
    throw new Error("Could not fetch document")
  }
  doc = doc.result

  // if the document has no conflicts, there's nothing to do
  if (!doc._conflicts) {
    throw new Error('document has no conflicts')
  }
  if (opts.verbose) {
    console.log(doc._conflicts.length + ' conflicts')
  }

  // generate a list of revisions to delete
  for (const i in doc._conflicts) {
    if (doc._conflicts[i] !== opts.keep) {
      deletions.push({ _id: doc._id, _rev: doc._conflicts[i], _deleted: true })
    } else {
      found = true
    }
  }
  // delete the current winner if required
  if (opts.keep) {
    if (doc._rev !== opts.keep) {
      deletions.push({ _id: doc._id, _rev: doc._rev, _deleted: true })
    } else {
      found = true
    }
  }

  // if we haven't come across the revision we are supposed to keep, don't proceed
  if (opts.keep && !found) {
    throw new Error('Revision ' + opts.keep + ' not found - no conflicts removed')
  }

  // if there are no deletions in the array, we've nothing to do
  if (deletions.length === 0) {
    throw new Error('No conflicts found')
  }

  if (opts.verbose && opts.keep) {
    console.log('Keeping revision ' + opts.keep)
  }

  // perform deletions
  opts.deletions = deletions
  const retval = await processDeletions(opts)
  return retval
}

module.exports = decon
