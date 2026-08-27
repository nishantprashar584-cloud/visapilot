Add the official Schengen form PDFs here with these exact filenames:

- `schengen_france.pdf`
- `schengen_spain.pdf`
- `schengen_germany.pdf`

Use `npm run inspect:pdf -- public/templates/<filename>.pdf` to inspect field names before adjusting the country map if the embassy-supplied PDF uses different form-field identifiers.

Use `npm run extract:pdf-fields -- public/templates/<filename>.pdf` for a plain-text AcroForm audit that prints each internal field name and field type.