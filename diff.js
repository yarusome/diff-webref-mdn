import {
  data as mdnData,
  keyMap,
  unusedFilters as unusedMdnFilters,
} from "./mdn.js";
import {
  data as refData,
  unusedFilters as unusedWebrefFilters,
} from "./webref.js";
import keyCoverages from "./key-coverages.js";
import * as utils from "./utils.js";

const literalKeys = new Set([
  "inherited",
  "initial",
  "syntax",
]);

for (const key in keyCoverages) {
  keyCoverages[key] = new Set(keyCoverages[key]);
}

/**
 * Diff an MDN object and a Webref Object,
 * both of which have homogeneous values.
 * @param {Object} mdn
 * @param {Object} ref
 */
function diff(mdn, ref) {
  let mdnOnly = {};

  for (const key in mdn) {
    if (!(key in ref)) {
      // Tolerate prefixed keys
      if (!/^\W*?-/u.test(key)) {
        mdnOnly[key] = mdn[key];
      }
      delete mdn[key];
    } else {
      let mdnItem = mdn[key];
      let refItem = ref[key];
      let mdnOnly = {};

      for (const key in mdnItem) {
        if (!(key in refItem)) {
          mdnOnly[key] = mdnItem[key];
          delete mdnItem[key];
          continue;
        }

        let mdn = mdnItem[key];
        let ref = refItem[key];

        if (typeof mdn == "object") {
          diff(mdn, ref);
          if (utils.isEmpty(mdn)) {
            delete mdnItem[key];
          }
          continue;
        }

        if (literalKeys.has(key)) {
          if (mdn === ref) {
            delete mdnItem[key];
            continue;
          }
        } else {
          const coverage = keyCoverages[mdn];
          if (
            [ref].flat()
              .every((item) => coverage?.has(item))
          ) {
            delete mdnItem[key];
            continue;
          }

          mdn = {
            key: mdn,
            text: keyMap[mdn] || "[[Missing]]",
          };
        }

        mdnItem[key] = { mdn, ref };
      }

      if (!utils.isEmpty(mdnOnly)) {
        mdnItem["[[MDN-only]]"] = mdnOnly;
      } else if (utils.isEmpty(mdnItem)) {
        delete mdn[key];
      }
    }
  }

  if (!utils.isEmpty(mdnOnly)) {
    mdn["[[MDN-only]]"] = mdnOnly;
  }
}

for (const key in mdnData) {
  if (!(key in refData)) {
    delete mdnData[key];
    continue;
  }

  let mdn = mdnData[key];
  let ref = refData[key];

  diff(mdn, ref);

  if (utils.isEmpty(mdn)) {
    delete mdnData[key];
    continue;
  }

  for (const key in mdn) {
    if (key in ref) {
      mdn[key] = {
        spec: ref[key].spec,
        ...mdn[key],
      };
    }
  }
}

console.info("Diff generated.");

export {
  /** The diff from the MDN data to the Webref data */
  mdnData as diff,
  unusedMdnFilters,
  unusedWebrefFilters,
};
