import { describe, expect, it } from 'vitest'
import { parseRepositoryInput } from './github'

describe('parseRepositoryInput', () => {
  it('accepts owner/repository', () => {
    expect(parseRepositoryInput('flennium/LightStaff')).toEqual({ owner: 'flennium', repo: 'LightStaff' })
  })

  it('accepts a GitHub URL and removes .git', () => {
    expect(parseRepositoryInput('https://github.com/flennium/PluginPulse.git')).toEqual({ owner: 'flennium', repo: 'PluginPulse' })
  })

  it.each(['', 'owner', 'owner/repo/issues', 'owner/repo?tab=readme', 'owner/<repo>'])('rejects %s', (value) => {
    expect(parseRepositoryInput(value)).toBeNull()
  })
})
