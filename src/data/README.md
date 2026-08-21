# Data modules

- `vocabulary/` contains bundled vocabulary fixtures.
- `practice/` contains original practice and mock-exam fixtures.
- `defaultData.js` is a compatibility facade; do not add large datasets to it.

Add a new content pack in its own file and export it through the facade. Keep UI,
storage, and network logic out of this directory.
