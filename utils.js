function genLexicoOrder(...keys) {
  return (a, b) => {
    for (const key of keys) {
      const isInA = key in a;
      const isInB = key in b;

      if (!isInA) {
        if (!isInB) {
          continue;
        }
        return -1;
      }
      if (!isInB) {
        return 1;
      }

      const x = a[key];
      const y = b[key];

      if (x > y) {
        return 1;
      }
      if (x < y) {
        return -1;
      }
    }
    return 0;
  };
}

async function getJSON(url) {
  let response;
  while (true) {
    try {
      response = await fetch(url);
      break;
    } catch {
      console.warn(`Retry requesting ${url} in 5 seconds.`);
      await new Promise(
        (resolve) => setTimeout(resolve, 5000)
      );
    }
  }

  if (response.ok) {
    return response.json();
  }
  throw new ReferenceError(`Failed to request ${url}.`);
}

function getJSONList(list) {
  return Promise.all(
    list.map((item) => utils.getJSON(item))
  );
}

function isEmpty(obj) {
  if (obj[Symbol.iterator]) {
    for (const item of obj) {
      return false;
    }
  }
  for (const key in obj) {
    return false;
  }
  return true;
}

export {
  /**
   * Generate a comparing function of the lexicographical order from keys.
   * @param {...string} keys
   * @return {function(Object, Object): number}
   */
  genLexicoOrder,
  /**
   * Get an object from the URL to a JSON file.
   * @param {string} url
   * @return {Promise<Object>}
   */
  getJSON,
  /**
   * Get an array of objects from an array of URLs to JSON files.
   * @param {string[]} list
   * @return {Promise<Object[]>}
   */
  getJSONList,
  /**
   * Check if an object's `@@iterator`,
   * if it exists, produces no next value,
   * *and* the object has no enumerable key.
   * @param {Object} obj
   * @return {boolean}
   */
  isEmpty,
};
