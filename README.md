# hermione-test-filter

Plugin for [hermione](https://github.com/gemini-testing/hermione) to filter tests specified in `json`-file.

## Install

```bash
npm install hermione-test-filter
```

## Configuration

* `enabled` **[Boolean]** (optional, `false` by default) - enable/disable the plugin.
* `inputFile` **[String]** (optional, `hermione-filter.json` by default) - path to file with tests to run.
* `filterTestsByCode` **[String|RegExp|Function]** (optional, `null` by default) - filtering tests by their code and hooks.

## Usage

### With inputFile

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

### With filterTestsByCode

**Works only with hermione@>=3.5.0.**

* Use plugin for filtering tests by their code:
```js
plugins: {
    'hermione-test-filter': {
        enabled: true,
        // run all tests with assertView
        filterTestsByCode: 'assertView',
        // or
        filterTestsByCode: (testSrc) => {
            return testSrc.includes('assertView');
        }
    }
}
```

* Use plugin for filtering tests by their code from input file:
```js
plugins: {
    'hermione-test-filter': {
        enabled: true,
        // run all tests with assertView from input file
        inputFile: 'some/file.json',
        filterTestsByCode: 'assertView'
    }
}
```

* Run plugin with cli option for filtering tests by their code:
```
npx hermione --filter-tests-by-code assertView
```
