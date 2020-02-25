
const axios = require('axios').default
const async = require('async')
const iam = require('./iam.js')
const headers = {}

const getDoc = function (url) {
  const req = {
    method: 'get',
    url: url,
    headers: headers,
    params: { conflicts: true }
  }
  return axios(req).then(r => { return r.data })
}

// opts - { url: '' , keep: '', batch: 100, verbose: false, deletions: [] }
const processDeletions = function (opts) {
  const deletionAim = opts.deletions.length
  let deletionCount = 0
  const progress = function (x, y) {
    const percent = 100 * x / y
    const charCount = Math.floor(percent / 2)
    const p = '[' + '='.repeat(charCount) + '-'.repeat(50 - charCount) + ']'
    process.stdout.write('  ' + p + ' ' + Math.floor(percent) + '% ' + x + '/' + y + '           \r')
  }
  return new Promise((resolve, reject) => {
    async.doWhilst(
      function (callback) {
        const b = opts.deletions.splice(0, opts.batch)
        if (b.length > 0) {
          if (opts.dryrun) {
            b.forEach((doc) => {
              console.log('DELETE ' + JSON.stringify(doc))
            })
            callback()
          } else {
            const r = {
              method: 'post',
              url: opts.url.replace(/\/[^/]+$/, '/_bulk_docs'),
              headers: headers,
              data: { docs: b }
            }
            if (opts.verbose) {
              progress(deletionCount, deletionAim)
            }
            axios(r).then((response) => {
              const data = response.data
              deletionCount += b.length
              callback(null, data)
            }).catch((e) => {
              console.log('! ', e)
              callback(e)
            })
          }
        } else {
          callback(null)
        }
      },
      function () {
        return (opts.deletions.length > 1)
      },
      function (err, data) {
        if (opts.verbose && !opts.dryrun) {
          progress(deletionCount, deletionAim)
          console.log('')
        }
        if (err) {
          reject(err)
        } else {
          resolve(deletionCount)
        }
      }
    )
  })
}

// opts - { url: '' , keep: '', batch: 100, verbose: false }
const decon = function (opts) {
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
  return iam.getToken(process.env.IAM_API_KEY).then((t) => {
    if (t) {
      headers.Authorization = 'Bearer ' + t
    }
    return getDoc(opts.url)
  }).then((d) => {
    doc = d

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
    return processDeletions(opts)
  })
}

module.exports = decon
