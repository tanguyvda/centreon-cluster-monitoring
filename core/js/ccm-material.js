/* global M */
/** @class CcmMaterial handles material design objects */
export default class CcmMaterial {
  constructor () {
    this.instance = {
      collapsible: {}
    };
  }

  /**
  * enable tooltip for a class
  *
  * @param {class} className The class on which you want to create a tooltip
  */
  buildTooltip (className) {
    const elems = document.querySelectorAll('.' + className);
    M.Tooltip.init(elems);
  }

  /**
  * enable Modal for an id
  *
  * @param {id} idName The id on which you want to create a modal
  */
  buildModal (idName) {
    const elems = document.querySelectorAll('#' + idName);
    M.Modal.init(elems);
  }

  /**
  * trigger modal from javascript
  *
  * @param {element} element The html element from which the modal is going to be triggered
  * @param {id} href The element id that must be linked through the href
  */
  triggerModal (element, href) {
    console.log('youhou');
    // add href to element
    element.attr('href', href);
    // click href to open modal
    element[0].click();
    // remove class and href so it cannot be manually triggered
    element.removeAttr('href');
    element.removeClass('modal-trigger');
  }

  /**
  * enable collapsible for an id
  *
  * @param {id} idName The id on which you want to create a collapsible
  */
  buildCollapsible (idName) {
    const elems = document.querySelectorAll('#' + idName);
    this.instance.collapsible[idName] = M.Collapsible.init(elems);

    return this.instance;
  }

  /**
  * display a toast with an error message
  *
  * @param {string} error The error message that is going to be displayed in the toast
  */
  toastError (error) {
    const toast = '<span>' + error +
      '</span><button class="btn-flat toast-action" onClick="this.dismissToast()">Dismiss</button>';
    M.toast({ html: toast });
  }

  /**
  * hide all toasts
  */
  dismissToast () {
    M.Toast.dismissAll();
  }

  /**
  * update collapsible options
  *
  * @param {id} idName The id on which you want to create a collapsible
  * @param {object} masonry The masonry object
  */
  updateCollapsible (idName, masonry) {
    this.instance.collapsible[idName][0].options.onOpenEnd = function () {
      masonry.masonry();
    };

    this.instance.collapsible[idName][0].options.onCloseEnd = function () {
      masonry.masonry();
    };

    return this.instance;
  }
}
