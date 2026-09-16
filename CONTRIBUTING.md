# Contributing to CiteLens

Thanks for helping out. Bug reports, ranking-quality feedback, and PRs are all welcome.

## Local setup

```bash
npm install
npm run dev      # Vite dev server
npm test         # type-check plus node --test suites
npm run build    # production build
```

The backend lives in `backend/`; the front end is TypeScript and Vite in `src/`.

## Before you open a PR

- `npm test` and `npm run build` both pass.
- Keep the change focused: one fix or feature per PR.
- Describe what you changed and why, and mention the paper or query that showed the problem if it is a ranking issue.

## Reporting ranking problems

Ranking issues are the most useful reports. Include the input you pasted (arXiv ID, DOI, title or URL), the sort mode, what CiteLens returned, and what you expected near the top. A concrete example beats a general description.

## License

By contributing you agree that your contribution is licensed under the MIT License.
