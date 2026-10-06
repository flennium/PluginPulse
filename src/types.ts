export interface GitHubOwner {
  login: string
  avatar_url: string
  html_url: string
}

export interface GitHubRepository {
  name: string
  full_name: string
  html_url: string
  description: string | null
  homepage: string | null
  owner: GitHubOwner
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  watchers_count: number
  language: string | null
  license: { spdx_id: string; name: string } | null
  topics: string[]
  default_branch: string
  archived: boolean
  updated_at: string
  pushed_at: string
  created_at: string
}

export interface ReleaseAsset {
  id: number
  name: string
  browser_download_url: string
  download_count: number
  size: number
  content_type: string
  updated_at: string
}

export interface GitHubRelease {
  id: number
  name: string | null
  tag_name: string
  html_url: string
  published_at: string | null
  created_at: string
  prerelease: boolean
  draft: boolean
  body: string | null
  assets: ReleaseAsset[]
}

export interface RateLimit {
  limit: number | null
  remaining: number | null
  resetAt: Date | null
}

export interface RepositoryReport {
  repository: GitHubRepository
  releases: GitHubRelease[]
  openIssueCount: number
  issueCountApproximate: boolean
  rateLimit: RateLimit
}
