import filters from "./mdn-filters.js";
import * as utils from "./utils.js";

let data, l10n;
if (typeof window == "undefined") {
  const mdn = await import("mdn-data");

  ({ css: data, l10n: { css: l10n } } = mdn.default);
  data.atrules = data.atRules;
  delete data.atRules;

  for (const key in data) {
    if (!(key in filters)) {
      delete data[key];
    }
  }
} else {
  const mdnBase = self.mdnBase || "https://github.com/mdn/data/raw/main/";
  const typeMap = {
    "atrules": "at-rules",
  };
  const types = Object.keys(filters);

  data = await utils.getJSONList(
    types.map((type) => `${mdnBase}css/${ typeMap[type] || type }.json`)
  );
  data = Object.fromEntries(
    types.map((_, i) => [types[i], data[i]])
  );
  l10n = await utils.getJSON(`${mdnBase}l10n/css.json`);
}

data = Object.fromEntries(
  Object.entries(data)
    .sort(utils.genLexicoOrder(0))
);

/** Keys under which the entries are to be sorted */
const sortKeys = new Set([
  "atrules",
  "descriptors",
  "functions",
  "properties",
  "selectors",
  "types",
]);
const unusedKeys = [
  "alsoAppliesTo",
  "groups",
  "interfaces",
  "mdn_url",
  "stacking",
  "status",
];

/**
 * Recursively delete unused keys from an object and its object values,
 * and sort the entries of its object values.
 * @param {Object} obj
 */
function reorgKeys(obj) {
  for (const key of unusedKeys) {
    delete obj[key];
  }

  if ("inherited" in obj) {
    obj.inherited = obj.inherited ? "yes" : "no";
  }

  for (const key in obj) {
    let value = obj[key];

    // Workaround for shorthand properties
    if (Array.isArray(value)) {
      obj[key] = "seeIndividualProperties";
      continue;
    }

    if (typeof value == "object") {
      reorgKeys(value);
      if (sortKeys.has(key)) {
        obj[key] = Object.fromEntries(
          Object.entries(value)
            .sort(utils.genLexicoOrder(0))
        );
      }
    }
  }
}

reorgKeys(data);

// Filter keys
for (const key in data) {
  let filter = filters[key];
  let value = data[key];

  if ("keys" in filter) {
    let keys = new Set(filter.keys);
    for (const key in value) {
      if (keys.has(key)) {
        keys.delete(key);
      } else {
        delete value[key];
      }
    }

    if (utils.isEmpty(keys)) {
      delete filter.keys;
    } else {
      filter.keys = [...keys];
    }
  }

  if ("subkeys" in filter) {
    let subkeys = Object.fromEntries(
      filter.subkeys
        .map((key) => [key, true])
    );
    for (const key in value) {
      let subvalue = value[key];
      for (const subkey in subvalue) {
        if (subkey in subkeys) {
          subkeys[subkey] = false;
        } else {
          delete subvalue[subkey];
        }
      }
    }

    subkeys = Object.entries(subkeys)
      .filter(([, value]) => value)
      .map(([key, ]) => key);

    if (utils.isEmpty(subkeys)) {
      delete filter.subkeys;
    } else {
      filter.subkeys = subkeys;
    }
  }
  
  if (utils.isEmpty(filter)) {
    delete filters[key];
  }
}

// Generate the key map
let keyMap = Object.fromEntries(
  Object.entries(l10n)
    .map(
      ([key, value]) => [key, value["en-US"]]
    )
);

console.info("MDN data fetched.");
if (!utils.isEmpty(filters)) {
  console.warn("Some MDN filters are not used.");
}

export {
  /** The MDN CSS data */
  data,
  /** The map from MDN l10n keys to presented texts */
  keyMap,
  /** Filters not used during filtering the MDN data */
  filters as unusedFilters,
};
