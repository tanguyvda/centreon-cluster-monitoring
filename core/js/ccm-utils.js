/** @class CcmUtils common methods that are not specific to clusters */
export default class CcmUtils {
  /**
  * checks if there is a white space in a string
  *
  * @param {string} string the string that needs to be tested
  * @return {bool}
  */
  testWhiteSpace (string) {
    return /\s/g.test(string);
  }

  /**
  * escape html characters from string
  *
  * @param {string} string the string that needs to be escaped
  * @return {string} string the string with escaped html characters
  */
  htmlEscape (string) {
    return string
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\//g, '&#x2F');
  }

  /**
  * unescape html characters from string
  *
  * @param {string} string the string that needs to be unescaped
  * @return {string} string the string with unescaped html characters
  */
  htmlUnescape (string) {
    return string
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&#x2F/g, '/');
  }
}
