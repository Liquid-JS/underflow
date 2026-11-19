// see https://github.com/conventional-changelog/conventional-changelog/blob/master/packages/conventional-changelog-angular/writer-opts.js

export default {
    writerOpts: {
        // the commit can't be changed, so this returns the changed fields, which the writer applies to a copy
        transform: (commit, context) => {
            const issues = []
            const types = {
                feat: 'Features',
                fix: 'Bug Fixes',
                perf: 'Performance Improvements',
                revert: 'Reverts',
                docs: 'Documentation',
                style: 'Styles',
                refactor: 'Code Refactoring',
                test: 'Tests',
                build: 'Build System',
                ci: 'Continuous Integration'
            }
            const type = commit.revert ? types.revert : types[commit.type]

            if (!type) {
                return
            }

            let subject = commit.subject

            if (typeof subject === 'string') {
                let url = context.repository
                    ? `${context.host}/${context.owner}/${context.repository}`
                    : context.repoUrl
                if (url) {
                    url = `${url}/issues/`
                    // Issue URLs.
                    subject = subject.replace(/#([0-9]+)/g, (_, issue) => {
                        issues.push(issue)
                        return `[#${issue}](${url}${issue})`
                    })
                }
                if (context.host) {
                    // User URLs.
                    subject = subject.replace(/\B@([a-z0-9](?:-?[a-z0-9/]){0,38})/g, (_, username) => {
                        if (username.includes('/')) {
                            return `@${username}`
                        }

                        return `[@${username}](${context.host}/${username})`
                    })
                }
            }

            return {
                type,
                scope: commit.scope === '*' ? '' : commit.scope,
                shortHash: typeof commit.hash === 'string' ? commit.hash.substring(0, 7) : commit.shortHash,
                subject,
                notes: commit.notes.map((note) => ({ ...note, title: 'BREAKING CHANGES' })),
                // remove references that already appear in the subject
                references: commit.references.filter((reference) => !issues.includes(reference.issue))
            }
        },
        commitsSort: (a, b) => {
            if (a.scope == b.scope) {
                if (a.subject == b.subject)
                    return 0
                if (!a.subject)
                    return -1
                if (!b.subject)
                    return 1
                return a.subject.toLowerCase().localeCompare(b.subject.toLowerCase())
            }
            if (!a.scope)
                return -1
            if (!b.scope)
                return 1
            return a.scope.toLowerCase().localeCompare(b.scope.toLowerCase())
        }
    }
}
