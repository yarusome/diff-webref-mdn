# Diff the Webref CSS data from MDN

This repository serves as a utility to diff the CSS data in [`w3c/webref`](https://github.com/w3c/webref/) from those in [`mdn/data`](https://github.com/mdn/data/) based on customizable [`mdn-filters.js`](#structure-of-mdn-filtersjs), [`webref-filters.js`](#structure-of-webref-filtersjs), and [`key-coverages.js`](#structure-of-key-coveragesjs). It can be used to:

  - identify data issues in both sources;
  - [update the MDN data according to the Webref data](#updating-mdndata-in-coordination).

## Using the GitHub Action

A Github Action is provided to generates the diff from [@webref/css](https://www.npmjs.com/package/@webref/css) to [mdn-data](https://www.npmjs.com/package/mdn-data).

Usage:

  1. Navigate to the "Actions" page.
  2. Click "diff-data" under "All workflows".
  3. In the dropdown menu of the "Run workflow" button, select a branch.
  4. Run the action.
  5. Download the artifact on the page of this workflow run.

## Using the browser console

For more flexibility to customize the data sources, a code snippet is provided below to generate the diff when running in the browser console. The default data sources are the [curated](https://github.com/w3c/webref/tree/curated/ed/) branch of `w3c/webref` and the [main](https://github.com/mdn/data/tree/main/) branch of `mdn/data`.

> **Note:** The code snippet requires Firefox ≥ 89, Chrome ≥ 89, or Safari ≥ 15.

Usage:

  1. Navigate to the page of any branch of this repository (or any fork of it).

  2. Run the following code snippet in the browser console:

     ```js
     // Uncomment to customize the directories
     // used to fetch MDN and Webref data.
     // self.mdnBase = "https://github.com/mdn/data/raw/main/";
     // self.webrefBase = "https://github.com/w3c/webref/raw/curated/ed/";
     
     (async () => {
       const path = /^((\/[^/]+){2})((\/[^/]+){2})?.*/.exec(location.pathname);
       if (!path) {
         throw new ReferenceError("No base branch found.");
       }
     
       const base = document.createElement("base");
       base.href = `https://github.com${path[1]}/raw${
         path[3] ? path[4] : "/main"
       }/`;
       document.head.prepend(base);
     
       const output = await import("./diff.js");
       for (const key in output) {
         const str = JSON.stringify(output[key], null, 2);
         if (str != "{}") {
           sessionStorage[key] = str;
         }
       }
     
       console.info("Outputs stored in sessionStorage.");
     })();
     ```

     > **Note:** The XHR logging can be turned on to monitor the downloading progress. 

  3. Use `console.log()` to display the outputs.

## Updating `mdn/data` in coordination

The following procedure can be used to fix or add entries to `mdn/data` while ensuring consistency with `w3c/webref`:

  1. Make the tentative update in a branch of `mdn/data`.
  2. Use the code snippet in [Using the browser console](#using-the-browser-console) with the value of `self.mdnBase` changed to the branch that contains the update.
  3. Run the code snippet in the browser console.
  4. Verify if the updated entries are consistent with `w3c/webref`.
  5. If necessary, modify `filters.js` and `key-coverags.js` accordingly, reload the page, and re-run the code snippet for verification.
  6. Make a pull request to `mdn/data`.

## Structure of `diff.json`

`diff.json` essentially follows the structure of the CSS data in `mdn/data`.

For any key present in both `mdn/data` and `w3c/webref` that differs in the two sources, the key's value is replaced by an object with the `mdn` and `ref` keys showing respective values.

Example:

```json
"syntax": {
  "mdn": "[ <integer> && <symbol> ]#",
  "ref": "[ <integer [0,∞]> && <symbol> ]#"
}
```

If the key is mapped to actual texts by [`l10n/css.json`](https://github.com/mdn/data/blob/main/l10n/css.json) in `mdn/data`, the `mdn` key's value is an object with the `key` and `text` keys.

Example:

```json
"computed": {
  "mdn": {
    "key": "asSpecified",
    "text": "as specified"
  },
  "ref": "list, each item a duration"
}
```

For any key present in `mdn/data` but absent from `w3c/webref`, the key's entry is relocated to be under the `[[MDN-only]]` key on the same level of the original key.

Example:

```json
"order": {
  "mdn": {
    "key": "uniqueOrder",
    "text": "the unique non-ambiguous order defined by the formal grammar"
  },
  "ref": "per grammar"
},
"[[MDN-only]]": {
  "media": "visual"
}
```

## Structure of `mdn-filters.js`

`mdn-filters.js` is effectively a JSON file, but wrapped as a module to enable the full syntax of JavaScript, including comments and trailing commas.

Its keys can be any of `atrules`, `functions`, `properties`, `selectors`, and `types`, which indicate the types of definitions included in the diff.

> **Note:** Descriptors are not able to be filtered directly since they are not at the top level.

Its values are objects with two optional keys - `keys` and `subkeys`, the values of which are arrays.

  - The items under `keys` indicate the definitions included in the diff. If omitted, all definitions are included.
  - The items under `subkeys` indicate the informations under each definitions included in the diff. If omitted, all informations are included.

Example:

```json
"atrules": {
  "keys": [
    "@counter-style",
    "@media"
  ],
  "subkeys": [
    "syntax",
    "descriptors",
  ],
},
"functions": {}
```

> **Note:** Prefixed definitions will be removed from the diff if not found in `w3c/webref`. Therefore it is unnecessary to specifically block prefixed definitions.

## Structure of `webref-filters.js`

`webref-filters.js` is effectively a JSON file, but wrapped as a module to enable the full syntax of JavaScript, including comments and trailing commas.

Its keys are the specification JSONs' names under [`ed/css`](https://github.com/w3c/webref/tree/curated/ed/css/) in `w3c/webref`, which indicate the specifications included for the diff.

Its values are `<filter>`s as recursively defined below:

```
<filter> = {
  "[[allow]]"?: [ <key>, …, <key> ],
  "[[block]]"?: [ <key>, …, <key> ],
  <key>*: <filter>
}
```

where:

  - Each `<key>` representes a string;
  - `*` indicates at least zero occurence of a key;
  - `?` indicates zero or one occurrence of a key;
  - `<key>`s under `allow` indicate the keys included at this level, and `allow` defaults to the array of all keys at this level;
  - `<key>`s under `block` indicate the keys excluded at this level, and `block` defaults to the empty array.

> **Note:** Although `allow` and `block` can be present at the same level, this would likely obscure the filters' intention.

Example:

```json
"css-fonts": {
  "[[block]]": [
    "types"
  ],
  "atrules": {
    "[[allow]]": [
      "@font-face",
      "@font-palette-values"
    ],
    "@font-face": {
      "descriptors": {
        "[[allow]]": [
          "font-family",
          "src"
        ]
      }
    }
  },
  "properties": {
    "font-weight": {
      "[[block]]": [
        "computed",
        "order"
      ]
    }
  }
}
```

## Structure of `key-coverages.js`

`key-coverages.js` is effectively a JSON file, but wrapped as a module to enable the full syntax of JavaScript, including comments and trailing commas.

Its keys are from [`l10n/css.json`](https://github.com/mdn/data/blob/main/l10n/css.json) in `mdn/data`, and its values are the text values in `w3c/webref` that the key should cover.

Example:

```json
"asSpecified": [
  "as specified",
  "specified keyword",
  "specified keyword or a pair of numbers",
  "specified keyword(s)",
  "specified keyword, identifier, and/or integer"
]
```
