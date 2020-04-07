import CcmUtils from './ccm-utils.js';
import CcmMaterial from './ccm-material.js';
import CcmCluster from './ccm-cluster.js'

/** @class CcmDragAndDrop handles the drag and drop of objects */
export default class CcmDragAndDrop {
  /**
  * create an instance of CcmDragAndDrop
  *
  * @param {element} ccmSource The source container that is going to be dragged
  * @param {element} ccmTarget The target container on which we can drop the source
  * @param {object} options The options for dragula
  * @param {string} targetType The type of drop area that is used
  * @param {bool} init Should we initiate multi select using shift
  */
  constructor (ccmSource, ccmTarget, options, targetType, init) {
    // var this = this;
    this.cluster = new CcmCluster();
    this.material = new CcmMaterial();
    this.ccmSource = ccmSource[0];
    this.ccmTarget = ccmTarget[0];
    this.draggable = dragula([this.ccmSource, this.ccmTarget], options);
    this.mirrorContainer = '';
    this.hasMultiple = false;
    this.selectedItems = '';

    if (init) {
      this.init();
      this.drag();
      this.cloned();
    }
    this['over' + targetType]();
    this['drop' + targetType]();
    this['out' + targetType]();
    this.dragend();
  }

  drag () {
    this.draggable.on('drag', el => {});
  }

  cloned () {
    const self = this;
    this.draggable.on('cloned', (clone, original, type) => {
      // grab the mirror created by dragula
      self.mirrorContainer = $('.gu-mirror').first();
      // remove class selectedItem on created mirrors because they don't need it
      self.mirrorContainer.removeClass('selectedItem');
      // we add the row class to our mirror container so our children div stay inline instead of one under the other
      self.mirrorContainer.addClass('row');
      // get multi selected items
      self.selectedItems = $('.selectedItem');
      // do we have multiple items selected
      self.hasMultiple = self.selectedItems.length > 1 ||
        (self.selectedItems.length === 1 &&
        !$(original).hasClass('selectedItem'));

      if (self.hasMultiple) {
        // the gu-mirror div is a clone of the first element we drag, we remove unecessary classes to avoid visual artifacts
        $('.gu-mirror').removeClass('ccm-host col s12');
        // if we already dragged something from an unselected item, we add the class selectedItem
        $('.gu-transit').addClass('selectedItem');
        self.selectedItems = $('.selectedItem');
        // empty the mirror container, we are going to add it in our own items
        self.mirrorContainer.empty();

        // clone the selected items into the mirror container
        self.selectedItems.each(function (index) {
          const item = $(this);
          // clone the item
          const mirror = item.clone(true);
          // remove the state classes
          mirror.removeClass('selectedItem gu-transit');
          // add the clone to the mirror container
          self.mirrorContainer.append(mirror);
          // we add the row class to our mirror container so our children div stay inline instead of one under the other
          $(self.mirrorContainer).parent().addClass('row');
          // add drag state class to item
          item.addClass('gu-transit');
        });
      }
    });
  }

  overClusterGroup () {
    const self = this;
    this.draggable.on('over', function (el, container, source) {
      // this.mirrorContainer = $('.gu-mirror').first();
      const isOverCcmClusterGroup = $(container).attr('id') === 'ccm-drop_cluster_group';

      if (isOverCcmClusterGroup) {
        $('#ccm-drop_cluster_group').css({ 'border-color': '#000', color: '#000' });
      }

      self.selectedItems.css('display', 'none');
    });
  }

  dropClusterGroup () {
    console.log('before draggable');
    console.log(this);
    const self = this;
    this.draggable.on('drop', function (el, target, source, sibling) {
      console.log('after draggable');
      console.log(self);
      self.mirrorContainer = $('.gu-mirror').first();
      // convert to jquery
      target = $(target);
      const hostInformation = [];
      // flag if dropped on cluster group
      const isCcmClusterGroup = target.attr('id') === 'ccm-drop_cluster_group';
      // are we dropping multiple items
      if (self.hasMultiple) {
        // are we adding items to cluster group
        if (isCcmClusterGroup) {
          $('#ccm-drop_cluster_group').addClass('modal-trigger');
          // get the default, single dropped item
          $(self.mirrorContainer.children()).each(function () {
            hostInformation[$(this).attr('id')] = $(this).data('json');
          });

          const keys = Object.keys(hostInformation);
          $('#ccm-cluster_creation_table_body').empty();

          for (const key of keys) {
            $('#ccm-cluster_creation_table_body')
              .append(self.cluster.buildHostElementForCollapsible(hostInformation[key], true));
          }
          self.material.triggerModal($('#ccm-drop_cluster_group'), '#ccm-modal_drop_cluster_group');
          // remove the remaining items from the dom
          $('.selectedItem').removeClass('.selectedItem');
          // clear flag
          self.hasMultiple = false;
          self.draggable.cancel(true);
        } else { // keeping items on the source
          self.draggable.cancel(true);
        }
      } else {
        $('#ccm-drop_cluster_group').addClass('modal-trigger');
        hostInformation[$(self.mirrorContainer[0]).attr('id')] = $(self.mirrorContainer[0]).data('json');
        const keys = Object.keys(hostInformation);
        $('#ccm-cluster_creation_table_body').empty();
        console.log('host info');
        console.log(hostInformation);
        for (const key of keys) {
          console.log()
          $('#ccm-cluster_creation_table_body')
            .append(self.cluster.buildHostElementForCollapsible(hostInformation[key], true));
        }
        self.material.triggerModal($('#ccm-drop_cluster_group'), '#ccm-modal_drop_cluster_group');
        $(self.ccmTarget).children().removeClass('selectedItem');
        self.draggable.cancel(true);
      }
    });
  }

  outClusterGroup () {
    this.draggable.on('out', function (el, container) {
      $('#ccm-drop_cluster_group').css({ 'border-color': '#ededed', color: '#ededed' });
    });
  }

  dragend () {
    const self = this;
    this.draggable.on('dragend', function () {
      // rebind click event handlers for the new layouts
      self.unbindMultiselectOnTarget();
      // bindMultiselectOnSource();
      // remove state classes for multiple selections that may be back on the source
      if (self.selectedItems) {
        self.selectedItems.removeClass('gu-transit');
        self.selectedItems.css('display', '');
      }
    });
  }

  bindShiftPressEvent () {
    const self = this;
    // set flag on
    $(document).keydown(function (event) {
      if (event.shiftKey) {
        self.shiftIsPressed = true;
      }
    });

    // set flag off
    $(document).keyup(function () {
      self.shiftIsPressed = false;
    });
  }

  // enables items on source to be multiselected with a 'shift + click'
  bindMultiselectOnSource () {
    const self = this;
    $(self.ccmSource).children().each((index, el) => {
      $(el).off('click');
      $(el).on('click', function () {
        if (self.shiftIsPressed) {
          $(this).toggleClass('selectedItem');
        }
      });
    });
  }

  // disables multiselect on items on the target
  unbindMultiselectOnTarget () {
    $(this.ccmTarget).children().each((index, el) => {
      $(el).off('click');
    });
  }

  init () {
    this.bindShiftPressEvent();
    this.bindMultiselectOnSource();
  }
}
