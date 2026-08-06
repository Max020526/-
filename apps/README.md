# Application boundaries

The repository is being migrated from one combined Next.js application to an npm-workspace monorepo. The current root application remains the only buildable application during the compatibility phase.

- `admin/`: internal management ownership boundary.
- `operations/`: warehouse and store operations ownership boundary.
- `storefront/`: public retail storefront ownership boundary.
- `wholesale/`: reserved, disabled until explicitly enabled.

Do not point Netlify base directories at these folders until each contains a complete, independently tested application package. During the transition, separate Netlify sites may build the root application with a different `NEXT_PUBLIC_APP_SURFACE` value.
