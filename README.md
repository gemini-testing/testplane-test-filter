# hermione-test-filter

Plugin for [hermione](https://github.com/gemini-testing/hermione) to filter tests specified in `json`-reports.

## Install

```bash
npm install hermione-test-filter
```

## Configuration
* `enabled` **[Boolean]** (optional, `false` by default) - enable/disable the plugin.
* `reportsPath` **[String]** (optional, `hermione-*.json` by default) - path to reports with tests to run. It could specified as mask ot path to some file.

## Usage
```js
plugins: {
    'hermione-test-filter': {
        enabled: true,
        reportsPath: 'some/path/*.json'
    }
}
```
