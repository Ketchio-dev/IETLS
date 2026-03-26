# Private Reading Imports

Put your personally sourced Reading materials here as `.json` files.

## Important
- This folder is for **your own local/private materials**.
- Do **not** commit proprietary content you do not want in version control.
- The app does not fetch third-party banks for you; you paste your own material here and run the import command locally.

## Import command

```bash
npm run reading:import-private
```

That command compiles all `.json` files in this folder into:

- `data/runtime/reading-private-imports.json`

## Supported input shapes

### One set per file
```json
{
  "title": "Sample Reading Set",
  "sourceLabel": "Personal notes / owned material",
  "passage": "Paste the passage text here.",
  "questions": [
    {
      "type": "true_false_not_given",
      "prompt": "The passage claims that...",
      "answer": "NOT GIVEN",
      "acceptedVariants": ["NG"],
      "evidenceHint": "Paragraph 3"
    }
  ]
}
```

### Multiple sets per file
```json
{
  "sets": [
    {
      "title": "Set A",
      "passage": "...",
      "questions": []
    },
    {
      "title": "Set B",
      "passage": "...",
      "questions": []
    }
  ]
}
```

## Question fields
- `type`: any string label you want for now
- `prompt`: required
- `answer` or `answers`: required
- `acceptedVariants`: optional string array
- `options`: optional string array
- `explanation`: optional
- `evidenceHint`: optional
