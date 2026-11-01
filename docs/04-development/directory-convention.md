# Directory Convention

## Root Files

- `index.js`: Host plugin entry
- `client.js`: Client plugin entry
- `cordis.patch.yml`: Cordis bundle patch
- `package.json`: Bundle manifest
- `icon.svg`: Plugin icon
- `README.md`: Project overview
- `LICENSE`: License file

## Subdirectories

- `locale/`: Display metadata for different languages
- `docs/`: Project documentation
- `tests/`: Test files (to be added)
- `src/` (optional future): TypeScript source if we migrate from plain JS

## Future Additions

When adding new modules, prefer flat structure near root unless grouping is clearly beneficial.
