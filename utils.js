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

function getJSON(url) {
  return new Promise(
    (resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = "json";
      xhr.onload = () => {
        if (xhr.status >= 400) {
          throw new ReferenceError(`Failed to request ${url}.`);
        }
        resolve(xhr.response);
      }
      xhr.onerror = () => {
        console.warn(`Retry requesting ${url} in 5 seconds.`);
        setTimeout(
          () => resolve(utils.getJSON(url)),
          5000
        );
      };

      xhr.open("GET", url);
      xhr.send();
    }
  );
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
   * @return {Object}
   */
  getJSON,
  /**
   * Get an array of objects from an array of URLs to JSON files.
   * @param {string[]} list
   * @return {Object[]}
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
