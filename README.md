# hermione-test-filter

Plugin for [hermione](https://github.com/gemini-testing/hermione) to filter tests specified in `json`-file.

## Install

```bash
npm install hermione-test-filter
```

## Configuration
* `enabled` **[Boolean]** (optional, `false` by default) - enable/disable the plugin.
* `inputFile` **[String]** (optional, `hermione-filter.json` by default) - path to file with tests to run.

## Usage
* Require plugin in your hermione config file:
```js
plugins: {
    'hermione-test-filter': {
        enabled: true,
        inputFile: 'some/file.json'
    }
}
```
* Input file format:
```json
[
    {
        "fullTitle": "some-title",
        "browserId": "some-browser"
    }
]
```
