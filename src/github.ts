import type { GitHubRelease, GitHubRepository, RateLimit, RepositoryReport } from './types'

const API_ROOT = 'https://api.github.com'
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_PREFIX = 'pluginpulse:report:'

interface CachedReport {
  savedAt: number
  report: Omit<RepositoryReport, 'rateLimit'> & {
    rateLimit: Omit<RateLimit, 'resetAt'> & { resetAt: string | null }
  }
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly rateLimit?: RateLimit,
  ) {
    super(message)
    this.name = 'GitHubApiError'
  }
}

export function parseRepositoryInput(value: string): { owner: string; repo: string } | null {
  const cleaned = value.trim().replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\.git$/i, '')
  const [owner, repo, ...rest] = cleaned.split('/').filter(Boolean)
  if (!owner || !repo || rest.length > 0) return null
  const valid = /^[A-Za-z0-9_.-]+$/
  if (!valid.test(owner) || !valid.test(repo)) return null
  return { owner, repo }
}

function readRateLimit(response: Response): RateLimit {
  const limit = response.headers.get('x-ratelimit-limit')
  const remaining = response.headers.get('x-ratelimit-remaining')
  const reset = response.headers.get('x-ratelimit-reset')
  return {
    limit: limit ? Number(limit) : null,
    remaining: remaining ? Number(remaining) : null,
    resetAt: reset ? new Date(Number(reset) * 1000) : null,
  }
}

async function githubFetch<T>(path: string): Promise<{ data: T; rateLimit: RateLimit }> {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  const rateLimit = readRateLimit(response)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new GitHubApiError(body?.message ?? 'GitHub did not return repository data.', response.status, rateLimit)
  }
  return { data: (await response.json()) as T, rateLimit }
}

function readCachedReport(key: string): RepositoryReport | null {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${key}`)
    if (!raw) return null
    const cached = JSON.parse(raw) as CachedReport
    if (Date.now() - cached.savedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(`${CACHE_PREFIX}${key}`)
      return null
    }
    return {
      ...cached.report,
      rateLimit: {
        ...cached.report.rateLimit,
        resetAt: cached.report.rateLimit.resetAt ? new Date(cached.report.rateLimit.resetAt) : null,
      },
    }
  } catch {
    return null
  }
}

function writeCachedReport(key: string, report: RepositoryReport): void {
  try {
    const cached: CachedReport = {
      savedAt: Date.now(),
      report: {
        ...report,
        rateLimit: {
          ...report.rateLimit,
          resetAt: report.rateLimit.resetAt?.toISOString() ?? null,
        },
      },
    }
    window.localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(cached))
  } catch {
    // Storage can be unavailable in private browsing; live requests still work.
  }
}

export async function fetchRepositoryReport(owner: string, repo: string): Promise<RepositoryReport> {
  const cacheKey = `${owner}/${repo}`.toLowerCase()
  const cached = readCachedReport(cacheKey)
  if (cached) return cached

  const safeOwner = encodeURIComponent(owner)
  const safeRepo = encodeURIComponent(repo)
  const repositoryResult = await githubFetch<GitHubRepository>(`/repos/${safeOwner}/${safeRepo}`)
  const canonicalName = repositoryResult.data.full_name
  const [canonicalOwner, canonicalRepo] = canonicalName.split('/')
  const canonicalOwnerPath = encodeURIComponent(canonicalOwner)
  const canonicalRepoPath = encodeURIComponent(canonicalRepo)

  const releasesResult = await githubFetch<GitHubRelease[]>(
    `/repos/${canonicalOwnerPath}/${canonicalRepoPath}/releases?per_page=6`,
  )

  let openIssueCount = repositoryResult.data.open_issues_count
  let issueCountApproximate = true
  try {
    const issuesResult = await githubFetch<{ total_count: number }>(
      `/search/issues?q=${encodeURIComponent(`repo:${canonicalName} is:issue is:open`)}`,
    )
    openIssueCount = issuesResult.data.total_count
    issueCountApproximate = false
  } catch {
    // GitHub Search returns 422 for some valid public repositories. The repository
    // endpoint still provides a useful combined count of open issues and pull requests.
  }

  const report: RepositoryReport = {
    repository: repositoryResult.data,
    releases: releasesResult.data.filter((release) => !release.draft),
    openIssueCount,
    issueCountApproximate,
    rateLimit: repositoryResult.rateLimit,
  }
  writeCachedReport(cacheKey, report)
  if (canonicalName.toLowerCase() !== cacheKey) {
    writeCachedReport(canonicalName.toLowerCase(), report)
  }
  return report
}
