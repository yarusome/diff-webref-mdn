import filters from "./webref-filters.js";
import * as utils from "./utils.js";

let data;
if (typeof window == "undefined") {
  const { listAll } = await import("@webref/css");
  data = await listAll();

  for (const key in data) {
    if (!(key in filters)) {
      delete data[key];
    }
  }
} else {
  const webrefBase = self.webrefBase ||
    "https://github.com/w3c/webref/raw/curated/ed/";
  const specs = Object.keys(filters);

  data = await utils.getJSONList(
    specs.map((spec) => `${webrefBase}css/${spec}.json`)
  );
  data = Object.fromEntries(
    specs.map((_, i) => [specs[i], data[i]])
  );
}

const keyMap = {
  "appliesTo": "appliesto",
  "computedValue": "computed",
  "canonicalOrder": "order",
  "value": "syntax",
};
/** Keys under which the values won't go through normalizationString() */
const noNormalizationKeys = new Set([
  "name",
  "newValues",
  "syntax",
]);
const types = [
  "atrules",
  "functions",
  "properties",
  "selectors",
  "types",
];
const typeMap = {
  "function": "functions",
  "selector": "selectors",
  "type": "types",
};
const unusedKeys = [
  "for",
  "logicalPropertyGroup",
  "prose",
  "styleDeclaration",
//  "type", // special case
//  "values", // special case
];

/**
 * Change sentences into clauses, and normalize some patterns.
 * @param {string} str
 * @return {string}
 */
function normalizeString(str) {
  return str.replace(/\.$/, "")
    .replace(/‘|’/g, "'")
    .replace(/n\/a/gi, "n/a")
    // Process sentence casing
    .replace(
      /(?<=^\(?| \(|\. )\p{CWL}(?=\p{CWU}*\b)/gu,
      (match) => match.toLowerCase()
    )
    .replace(/\.(?= )/g, ";");
}

/**
 * Ensure spaces in the syntaxes to the:
 * - left of "&&", ")", "|", "||";
 * - right of "&&", "(", "|", "||";
 * - right of "[";
 * - left of "]";
 * - left of ",".
 * @param {string} str
 * @return {string}
 */
function normalizeSyntax(str) {
  return str.replace(/(?<![ &'(|])(?=[&)|])/g, " ")
    .replace(/(?<=[&(|])(?![- &')|])/g, " ")
    .replace(/(?<=[^ '])(?=\[)/g, " ")
    .replace(/(?<!')\[(?![- ,\d])/g, "[ ")
    // Workaround for unbounded lookbehind
    .replace(/( |,[-.∞\w]*?)(?=\])/gu, "$1\0")
    .replace(/\](?!'|-)/g, " ]")
    .replace(/\0 /g, "")
    .replace(/(?<=[!#*>?\]])(?=,)/g, " ");
}

/**
 * For an object of which the values are inhomogeneous objects,
 * recursively reorganize the keys of the object
 * under a given specification object.
 * @param {Object} spec
 * @param {Object} obj
 */
function reorgKeys(spec, obj) {
  for (const key of unusedKeys) {
    delete obj[key];
  }

  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      for (const item of obj[key]) {
        reorgKeys(spec, item);
      }
      if (utils.isEmpty(obj[key])) {
        delete obj[key];
      } else {
        obj[key].sort(utils.genLexicoOrder("name"));
      }
    }
  }

  delete obj.values;

  if ("value" in obj) {
    obj.value = normalizeSyntax(obj.value);
  } else if ("newValues" in obj) {
    obj.newValues = normalizeSyntax(obj.newValues);
  }

  for (const key in obj) {
    if (typeof obj[key] == "string" && !noNormalizationKeys.has(key)) {
      obj[key] = normalizeString(obj[key]);
    }
  }

  for (const key in obj) {
    const value = obj[key];
    delete obj[key];
    obj[keyMap[key] || key] = value;
  }

  // If obj represents a type, uplift it to the corresponding type.
  if ("type" in obj) {
    const type = typeMap[obj.type];
    delete obj.type;
    if (type) {
      obj.name = obj.name.replace(/^<(.*)>$/, "$1");
      spec[type].push(obj);
    }
  }
}

for (const key in data) {
  let spec = data[key];
  for (const type of types) {
    spec[type] ||= [];
  }

  reorgKeys(spec, spec);

  const { title } = spec.spec;
  for (const type of types) {
    if (spec[type]) {
      for (const item of spec[type]) {
        item.spec = title;
      }
    }
  }
}

/**
 * Filter an object through a given filter,
 * and remove used filter keys.
 * @param {Object} obj
 * @param {Object} filter
 */
function filterKeys(obj, filter) {
  const isArray = Array.isArray(obj);
  let keys = new Set(
    isArray ? obj.map((item) => item.name) : Object.keys(obj)
  );

  if ("[[allow]]" in filter) {
    let allow = new Set(filter["[[allow]]"]);
    for (const key of keys) {
      if (allow.has(key)) {
        allow.delete(key);
      } else {
        keys.delete(key);
      }
    }

    if (utils.isEmpty(allow)) {
      delete filter["[[allow]]"];
    } else {
      filter["[[allow]]"] = [...allow];
    }
  }

  if ("[[block]]" in filter) {
    let block = new Set(filter["[[block]]"]);
    for (const key of keys) {
      if (block.has(key)) {
        keys.delete(key);
        block.delete(key);
      }
    }

    if (utils.isEmpty(block)) {
      delete filter["[[block]]"];
    } else {
      filter["[[block]]"] = [...block];
    }
  }

  if (isArray) {
    for (let i = 0; i < obj.length; i++) {
      if (!keys.has(obj[i].name)) {
        obj.splice(i--, 1);
      }
    }
  } else {
    for (const key in obj) {
      if (!keys.has(key)) {
        delete obj[key];
      }
    }
  }

  for (const key in obj) {
    const keyName = isArray ? obj[key].name : key;
    if (!(keyName in filter)) {
      continue;
    }

    filterKeys(obj[key], filter[keyName]);

    if (utils.isEmpty(filter[keyName])) {
      delete filter[keyName];
    }
  }
}

for (const key in data) {
  filterKeys(data[key], filters[key]);
}

for (const key in filters) {
  if (utils.isEmpty(filters[key])) {
    delete filters[key];
  }
}

// Reorganize data by types
data = Object.values(data);
data = Object.fromEntries(
  types.map(
    (type) => [
      type,
      data.map((spec) => spec[type] || [])
        .flat()
        .sort(utils.genLexicoOrder("name", "newValues", "spec"))
    ]
  )
);

/**
 * Merge the homogeneoues items in an array by their "name" values.
 * @param {Array} arr
 * @return {Object}
 */
function mergeItems(arr) {
  let result = {};
  for (let i = 0, j = 0; i < arr.length; i = j) {
    const { name } = arr[i];
    while (j < arr.length && arr[j].name == name) {
      delete arr[j++].name;
    }

    const subarr = arr.slice(i, j);
    let keys = new Set(
      subarr.map((item) => Object.keys(item))
        .flat()
    );
    const isArrays = Object.fromEntries(
      [...keys].map(
        (key) => [
          key,
          subarr.some((item) => Array.isArray(item[key]))
        ]
      )
    );
    let obj = {};

    for (const key of keys) {
      let subsubarr = subarr.filter((item) => key in item)
        .map((item) => item[key])
        .flat();

      obj[key] = isArrays[key]
        ? mergeItems( // Nested items are unsorted
          subsubarr.sort(utils.genLexicoOrder("name"))
        )
        : [...new Set(subsubarr)];
    }

    // Append "newValues" to "syntax"
    if ("newValues" in obj) {
      if (obj.syntax.length > 1) {
        obj.syntax.push(...obj.newValues);
      } else {
        obj.syntax[0] += " | " + obj.newValues.join(" | ");
      }

      keys.delete("newValues");
      delete obj.newValues;
    }

    for (const key of keys) {
      if (!isArrays[key] && obj[key].length == 1) {
        obj[key] = obj[key][0];
      }
    }

    result[name] = obj;
  }

  return result;
}

for (const key in data) {
  data[key] = mergeItems(data[key]);
}

console.info("Webref data fetched.");
if (!utils.isEmpty(filters)) {
  console.warn("Some Webref filters are not used.");
}

export {
  /** Filters not used during filtering the Webref data */
  filters as unusedFilters,
  /** The Webref data */
  data,
};
