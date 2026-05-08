# Address Data Pipeline

This folder provides scripts to fetch, normalize and validate offline address data.

## Source

- `https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/states.json`
- `https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries+states+cities.json`

## Fetch and build geo dataset

```bash
go run ./scripts/address-data/fetch_geo_data.go \
  -countries=all \
  -city-limit=80 \
  -raw-dir=frontend/static/datasets/address/raw/v1 \
  -out=frontend/static/datasets/address/geo.v1.json
```

Raw upstream snapshots are saved under:

- `frontend/static/datasets/address/raw/v1/states.json`
- `frontend/static/datasets/address/raw/v1/countries+states+cities.json`

## Run per-country validation and report

```bash
node ./scripts/address-data/validate_generator.js 50
```

Reports:

- `frontend/static/datasets/address/validation-report.v1.json`
- `frontend/static/datasets/address/validation-report.v1.md`

## Notes

- Keep generated files versioned under `frontend/static/datasets/address/`.
- `rules.v1.json` stores offline zip/group rule metadata.
- Generator logic is driven in `frontend/static/js/address.js`.
- Before using any external dataset in production, review license terms of the data source.

