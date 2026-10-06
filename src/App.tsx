import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  Box,
  Check,
  CircleDot,
  Download,
  ExternalLink,
  GitFork,
  Github,
  History,
  Search,
  Star,
  Tag,
} from 'lucide-react'
import { formatBytes, formatDate, formatNumber, relativeDate } from './format'
import { fetchRepositoryReport, GitHubApiError, parseRepositoryInput } from './github'
import type { GitHubRelease, GitHubTag, RepositoryReport } from './types'

const EXAMPLES = ['flennium/LightStaff', 'PaperMC/Paper', 'lucko/LuckPerms']

type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; stage: number }
  | { status: 'success'; report: RepositoryReport }
  | { status: 'error'; message: string; detail: string }

function releaseDownloads(release: GitHubRelease): number {
  return release.assets.reduce((total, asset) => total + asset.download_count, 0)
}

export function App() {
  const initialRepository = new URLSearchParams(window.location.search).get('repo') ?? ''
  const [query, setQuery] = useState(initialRepository)
  const [state, setState] = useState<LoadState>({ status: 'idle' })

  useEffect(() => {
    if (state.status !== 'loading') return
    const timer = window.setInterval(() => {
      setState((current) =>
        current.status === 'loading' ? { ...current, stage: Math.min(current.stage + 1, 2) } : current,
      )
    }, 500)
    return () => window.clearInterval(timer)
  }, [state.status])

  async function inspect(value: string) {
    const parsed = parseRepositoryInput(value)
    if (!parsed) {
      setState({
        status: 'error',
        message: 'That repository address is incomplete.',
        detail: 'Use owner/repository or paste a full GitHub repository URL.',
      })
      return
    }

    setQuery(`${parsed.owner}/${parsed.repo}`)
    setState({ status: 'loading', stage: 0 })
    try {
      const report = await fetchRepositoryReport(parsed.owner, parsed.repo)
      const url = new URL(window.location.href)
      url.searchParams.set('repo', `${parsed.owner}/${parsed.repo}`)
      window.history.replaceState({}, '', url)
      setState({ status: 'success', report })
    } catch (error) {
      if (error instanceof GitHubApiError) {
        const isRateLimited = error.status === 403 && error.rateLimit?.remaining === 0
        setState({
          status: 'error',
          message: isRateLimited
            ? 'GitHub’s public request limit has been reached.'
            : error.status === 404
              ? 'GitHub could not find that public repository.'
              : 'GitHub could not complete this scan.',
          detail: isRateLimited
            ? `Try again after ${error.rateLimit?.resetAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) ?? 'the limit resets'}.`
            : error.message,
        })
      } else {
        setState({
          status: 'error',
          message: 'The network request did not complete.',
          detail: 'Check your connection and run the scan again.',
        })
      }
    }
  }

  useEffect(() => {
    if (initialRepository) void inspect(initialRepository)
    // Only read the initial URL once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    void inspect(query)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="./" aria-label="PluginPulse home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>PluginPulse</span>
        </a>
        <div className="topbar-meta">
          <span>Public GitHub data</span>
          <a href="https://github.com/flennium/PluginPulse" target="_blank" rel="noreferrer">
            <Github size={18} aria-hidden="true" /> Source
          </a>
        </div>
      </header>

      <main>
        <section className="scan-section" aria-labelledby="scan-title">
          <div className="scan-copy">
            <h1 id="scan-title">Read the health of a release.</h1>
            <p>One public repository. Its latest release, usable downloads, issue pressure, and activity—without a token.</p>
          </div>

          <form className="scan-form" onSubmit={submit} noValidate>
            <label htmlFor="repository">GitHub repository</label>
            <div className="input-rail">
              <Github aria-hidden="true" />
              <input
                id="repository"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="owner/repository"
                autoComplete="off"
                spellCheck="false"
                aria-describedby="repository-hint"
              />
              <button type="submit" disabled={state.status === 'loading'}>
                <Search size={18} aria-hidden="true" />
                {state.status === 'loading' ? 'Scanning' : 'Inspect repository'}
              </button>
            </div>
            <div className="scan-foot" id="repository-hint">
              <span>Try an example:</span>
              {EXAMPLES.map((example) => (
                <button key={example} type="button" onClick={() => void inspect(example)}>{example}</button>
              ))}
            </div>
          </form>

          <StatusRail state={state} />
        </section>

        {state.status === 'success' && <RepositoryWorkspace report={state.report} />}
        {state.status === 'idle' && <IdleLedger />}
      </main>

      <footer>
        <span>PluginPulse</span>
        <p>Live data from the GitHub REST API. No credentials are stored.</p>
        <a href="https://docs.github.com/en/rest" target="_blank" rel="noreferrer">API documentation <ArrowUpRight size={15} /></a>
      </footer>
    </div>
  )
}

function StatusRail({ state }: { state: LoadState }) {
  if (state.status === 'idle' || state.status === 'success') return null
  if (state.status === 'error') {
    return (
      <div className="status-rail error" role="alert">
        <AlertCircle aria-hidden="true" />
        <div><strong>{state.message}</strong><span>{state.detail}</span></div>
      </div>
    )
  }
  const stages = ['Validating repository', 'Contacting GitHub', 'Reading release history']
  return (
    <div className="status-rail loading" role="status" aria-live="polite">
      <div className="scan-beam" aria-hidden="true" />
      {stages.map((stage, index) => (
        <div className={index <= state.stage ? 'active' : ''} key={stage}>
          {index < state.stage ? <Check size={16} /> : <span className="stage-dot" />}
          <span>{stage}</span>
        </div>
      ))}
    </div>
  )
}

function IdleLedger() {
  return (
    <section className="idle-ledger" aria-label="What PluginPulse checks">
      <div><span>Release</span><strong>Latest published version</strong></div>
      <div><span>Assets</span><strong>Files, size, and downloads</strong></div>
      <div><span>Pressure</span><strong>Open issues and activity</strong></div>
      <div><span>Source</span><strong>Links back to GitHub</strong></div>
    </section>
  )
}

function RepositoryWorkspace({ report }: { report: RepositoryReport }) {
  const { repository, releases, tags, openIssueCount, issueCountApproximate, rateLimit } = report
  const latest = releases[0]
  const latestTag = tags[0]
  const totalDownloads = useMemo(() => releases.reduce((sum, release) => sum + releaseDownloads(release), 0), [releases])
  const health = repository.archived ? 'Archived' : latest ? 'Publishing' : latestTag ? 'Tagged source' : 'No versions'

  return (
    <section className="workspace" aria-labelledby="repository-name">
      <div className="repository-masthead">
        <div className="repository-identity">
          <img src={repository.owner.avatar_url} alt="" width="48" height="48" />
          <div>
            <span>{repository.owner.login}</span>
            <h2 id="repository-name">{repository.name}</h2>
          </div>
        </div>
        <div className="health-stamp" data-tone={health === 'Publishing' || health === 'Tagged source' ? 'healthy' : 'warning'}>
          <CircleDot size={17} aria-hidden="true" />
          <span>Release status</span>
          <strong>{health}</strong>
        </div>
        <a className="github-link" href={repository.html_url} target="_blank" rel="noreferrer">
          Open on GitHub <ExternalLink size={16} />
        </a>
      </div>

      <div className="workspace-grid">
        <div className="operational-column">
          <section className="latest-release" aria-labelledby="latest-release-title">
            <div className="section-heading">
              <div>
                <History size={20} aria-hidden="true" />
                <h3 id="latest-release-title">{latest ? 'Latest release' : 'Latest version'}</h3>
              </div>
              {latest && <span>Published {formatDate(latest.published_at)}</span>}
            </div>
            {latest
              ? <ReleaseDetail release={latest} />
              : latestTag
                ? <TagDetail tag={latestTag} repositoryUrl={repository.html_url} />
                : <EmptyRelease repositoryUrl={repository.html_url} />}
          </section>

          <section className="release-history" aria-labelledby="release-history-title">
            <div className="section-heading">
              <div><Box size={20} aria-hidden="true" /><h3 id="release-history-title">{releases.length ? 'Release history' : 'Version history'}</h3></div>
              <span>{releases.length
                ? `${releases.length} recent ${releases.length === 1 ? 'release' : 'releases'}`
                : `${tags.length} recent ${tags.length === 1 ? 'tag' : 'tags'}`}</span>
            </div>
            {releases.length > 0 ? (
              <div className="release-table" role="table" aria-label="Recent releases">
                <div className="release-row header" role="row">
                  <span role="columnheader">Version</span><span role="columnheader">Published</span><span role="columnheader">Assets</span><span role="columnheader">Downloads</span>
                </div>
                {releases.map((release) => (
                  <a className="release-row" role="row" href={release.html_url} target="_blank" rel="noreferrer" key={release.id}>
                    <strong role="cell">{release.tag_name}{release.prerelease && <em>Pre-release</em>}</strong>
                    <span role="cell">{formatDate(release.published_at)}</span>
                    <span role="cell">{release.assets.length}</span>
                    <span role="cell">{formatNumber(releaseDownloads(release))}<ArrowUpRight size={14} /></span>
                  </a>
                ))}
              </div>
            ) : tags.length > 0 ? (
              <TagHistory tags={tags} repositoryUrl={repository.html_url} />
            ) : <p className="plain-empty">Published releases and version tags will appear here.</p>}
          </section>
        </div>

        <aside className="repository-folio" aria-label="Repository facts">
          <div className="folio-intro">
            <p>{repository.description ?? 'No repository description is available.'}</p>
            {repository.homepage && <a href={repository.homepage} target="_blank" rel="noreferrer">Project website <ArrowUpRight size={14} /></a>}
          </div>

          <dl className="metrics">
            <div><dt><Star size={16} /> Stars</dt><dd>{formatNumber(repository.stargazers_count)}</dd></div>
            <div><dt><GitFork size={16} /> Forks</dt><dd>{formatNumber(repository.forks_count)}</dd></div>
            <div title={issueCountApproximate ? 'Includes open issues and pull requests because GitHub Search did not accept this repository.' : undefined}>
              <dt><CircleDot size={16} /> {issueCountApproximate ? 'Open items' : 'Open issues'}</dt>
              <dd>{formatNumber(openIssueCount)}</dd>
            </div>
            <div><dt><Download size={16} /> Release downloads</dt><dd>{releases.length ? formatNumber(totalDownloads) : '—'}</dd></div>
          </dl>

          <dl className="facts">
            <div><dt>Primary language</dt><dd>{repository.language ?? 'Not detected'}</dd></div>
            <div><dt>License</dt><dd>{repository.license?.spdx_id ?? 'Not declared'}</dd></div>
            <div><dt>Default branch</dt><dd><code>{repository.default_branch}</code></dd></div>
            <div><dt>Last push</dt><dd title={formatDate(repository.pushed_at)}>{relativeDate(repository.pushed_at)}</dd></div>
            <div><dt>API allowance</dt><dd>{rateLimit.remaining ?? '—'} / {rateLimit.limit ?? '—'}</dd></div>
          </dl>

          {repository.topics.length > 0 && (
            <div className="topics" aria-label="Repository topics">
              {repository.topics.slice(0, 8).map((topic) => <span key={topic}>{topic}</span>)}
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}

function ReleaseDetail({ release }: { release: GitHubRelease }) {
  return (
    <div className="release-detail">
      <div className="release-title">
        <div>
          <span>{release.prerelease ? 'Pre-release' : 'Published release'}</span>
          <h4>{release.name || release.tag_name}</h4>
        </div>
        <code>{release.tag_name}</code>
      </div>
      {release.assets.length > 0 ? (
        <div className="asset-list">
          {release.assets.map((asset) => (
            <a href={asset.browser_download_url} key={asset.id}>
              <Download size={18} aria-hidden="true" />
              <span><strong>{asset.name}</strong><small>{formatBytes(asset.size)} · {formatNumber(asset.download_count)} downloads</small></span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          ))}
        </div>
      ) : <p className="plain-empty">This release has no downloadable assets.</p>}
    </div>
  )
}

function TagDetail({ tag, repositoryUrl }: { tag: GitHubTag; repositoryUrl: string }) {
  return (
    <div className="release-detail tag-detail">
      <div className="release-title">
        <div>
          <span>Git version tag</span>
          <h4>{tag.name}</h4>
        </div>
        <code>{tag.commit.sha.slice(0, 7)}</code>
      </div>
      <div className="asset-list">
        <a href={tag.zipball_url}>
          <Download size={18} aria-hidden="true" />
          <span><strong>Source code (ZIP)</strong><small>Archive generated by GitHub</small></span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <a href={tag.tarball_url}>
          <Download size={18} aria-hidden="true" />
          <span><strong>Source code (TAR.GZ)</strong><small>Archive generated by GitHub</small></span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </div>
      <a className="tag-source-link" href={`${repositoryUrl}/tree/${encodeURIComponent(tag.name)}`} target="_blank" rel="noreferrer">
        Inspect this tag on GitHub <ArrowUpRight size={15} />
      </a>
    </div>
  )
}

function TagHistory({ tags, repositoryUrl }: { tags: GitHubTag[]; repositoryUrl: string }) {
  return (
    <div className="release-table tag-table" role="table" aria-label="Recent version tags">
      <div className="tag-row header" role="row">
        <span role="columnheader">Version</span><span role="columnheader">Commit</span><span role="columnheader">Source</span>
      </div>
      {tags.map((tag) => (
        <a className="tag-row" role="row" href={`${repositoryUrl}/tree/${encodeURIComponent(tag.name)}`} target="_blank" rel="noreferrer" key={tag.commit.sha}>
          <strong role="cell"><Tag size={14} aria-hidden="true" />{tag.name}</strong>
          <code role="cell">{tag.commit.sha.slice(0, 7)}</code>
          <span role="cell">View tag <ArrowUpRight size={14} /></span>
        </a>
      ))}
    </div>
  )
}

function EmptyRelease({ repositoryUrl }: { repositoryUrl: string }) {
  return (
    <div className="empty-release">
      <Box size={28} aria-hidden="true" />
      <div><strong>No published releases yet.</strong><p>Tags and source archives are still available from the repository.</p></div>
      <a href={`${repositoryUrl}/tags`} target="_blank" rel="noreferrer">View tags <ArrowUpRight size={15} /></a>
    </div>
  )
}
