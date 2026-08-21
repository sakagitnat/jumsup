# Styles

- `base/` contains shared layout, components, and responsive rules.
- `features/` contains feature-specific rules.
- `themes/` contains theme overrides only.
- `index.css` defines the cascade order.

Put new rules in the closest feature file. Avoid adding rules to the compatibility
file `src/styles.css`.
