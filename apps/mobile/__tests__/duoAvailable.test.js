'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { interpretDuoProbeError, probeDuoAvailable } = require('../lib/duoAvailable')

function test(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (err) {
    console.error(`not ok - ${name}`)
    throw err
  }
}

async function testAsync(name, fn) {
  try {
    await fn()
    console.log(`ok - ${name}`)
  } catch (err) {
    console.error(`not ok - ${name}`)
    throw err
  }
}

test('interpretDuoProbeError: no error means available', () => {
  assert.strictEqual(interpretDuoProbeError(null), true)
  assert.strictEqual(interpretDuoProbeError(undefined), true)
})

test('interpretDuoProbeError: missing column means unavailable', () => {
  assert.strictEqual(
    interpretDuoProbeError({ message: 'column quests.min_party_size does not exist' }),
    false,
  )
  assert.strictEqual(
    interpretDuoProbeError({ code: 'PGRST204', message: 'Could not find the column' }),
    false,
  )
  assert.strictEqual(interpretDuoProbeError({ code: '42703', message: 'undefined column' }), false)
})

test('interpretDuoProbeError: other errors stay dark', () => {
  assert.strictEqual(interpretDuoProbeError({ message: 'JWT expired' }), false)
  assert.strictEqual(interpretDuoProbeError({ message: 'network down' }), false)
})

;(async () => {
  await testAsync('probeDuoAvailable: success → true', async () => {
    const client = {
      from() {
        return {
          select() {
            return {
              limit() {
                return Promise.resolve({ error: null })
              },
            }
          },
        }
      },
    }
    assert.strictEqual(await probeDuoAvailable(client), true)
  })

  await testAsync('probeDuoAvailable: missing column → false', async () => {
    const client = {
      from() {
        return {
          select(cols) {
            assert.strictEqual(cols, 'min_party_size')
            return {
              limit() {
                return Promise.resolve({
                  error: { message: 'column quests.min_party_size does not exist' },
                })
              },
            }
          },
        }
      },
    }
    assert.strictEqual(await probeDuoAvailable(client), false)
  })

  await testAsync('probeDuoAvailable: thrown error → false', async () => {
    const client = {
      from() {
        return {
          select() {
            return {
              limit() {
                return Promise.reject(new Error('offline'))
              },
            }
          },
        }
      },
    }
    assert.strictEqual(await probeDuoAvailable(client), false)
  })

  test('dark-launch call sites gate on useDuoAvailable / ensureDuoAvailable', () => {
    const root = path.join(__dirname, '..')
    const files = [
      'hooks/useParty.ts',
      'hooks/useDuoAvailable.ts',
      'app/party/[code].tsx',
      'app/(tabs)/index.tsx',
      'app/quest/[id].tsx',
      'app/submit/[questId].tsx',
    ]
    for (const rel of files) {
      const src = fs.readFileSync(path.join(root, rel), 'utf8')
      assert.ok(
        /useDuoAvailable|ensureDuoAvailable|duoAvailable/.test(src),
        `${rel} must reference the duo dark-launch guard`,
      )
    }
    // Party RPCs must not run without the guard.
    const party = fs.readFileSync(path.join(root, 'hooks/useParty.ts'), 'utf8')
    assert.ok(/ensureDuoAvailable\(\)/.test(party))
    assert.ok(party.indexOf('ensureDuoAvailable') < party.indexOf("rpc('own_party'"))
    assert.ok(party.indexOf('ensureDuoAvailable') < party.indexOf("rpc('create_party'"))
  })

  console.log('duoAvailable: all tests passed')
})().catch((err) => {
  console.error(err)
  process.exit(1)
})
