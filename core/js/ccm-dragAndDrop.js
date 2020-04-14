/* global $, dragula */
import CcmMaterial from './ccm-material.js';

/** @class CcmDragAndDrop handles the drag and drop of objects */
export default class CcmDragAndDrop {
  /**
  * create an instance of CcmDragAndDrop
  *
  * @param {object} options The options for dragula
  * @param {object} cluster Instance of cluster class
  */
  constructor (options, cluster) {
    this.mirrorContainer = '';
    this.hasMultiple = false;
    this.selectedItems = '';
    this.draggable = '';
    this.cluster = cluster;
    this.options = options;
    this.ccmSource = '';
    this.shiftIsPressed = false;
    this.material = new CcmMaterial();
  }

  /*
  * initiate on drag event
  */
  drag () {
    this.draggable.on('drag', el => {});
  }

  /*
  * initiate on cloned event
  */
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

  /*
  * initiate on over cluster group event
  */
  overClusterGroup () {
    const self = this;
    this.draggable.on('over', function (el, container, source) {
      const isOverCcmClusterGroup = $(container).attr('id') === 'ccm-drop_cluster_group';

      if (isOverCcmClusterGroup) {
        $('#ccm-drop_cluster_group').css({ 'border-color': '#000', color: '#000' });
      }

      self.selectedItems.css('display', 'none');
    });
  }

  /*
  * initiate on over cluster event
  */
  overCluster () {
    this.draggable.on('over', function (el, container, source) {
      const isOverCluster = $(container).attr('id') === 'ccm-cluster_group_cluster-group-name';

      if (isOverCluster) {
        $('#ccm-cluster_group_cluster-group-name').css({ color: 'red' });
      }
    });
  }

  /*
  * initate on drop in cluster group event
  *
  * @param {string} targetId The id of the cluster group drop area
  */
  dropClusterGroup (targetId) {
    const self = this;
    this.draggable.on('drop', function (el, target, source, sibling) {
      self.mirrorContainer = $('.gu-mirror').first();
      const hostInformation = [];
      const isCcmClusterGroup = $(target).attr('id') === targetId;
      if (isCcmClusterGroup) {
        if (self.hasMultiple) {
          // get the default, single dropped item
          $(self.mirrorContainer.children()).each(function () {
            hostInformation[$(this).attr('id')] = $(this).data('json');
          });
          // remove the remaining items from the DOM
          $('.selectedItem').removeClass('.selectedItem');
          // clear flag
          self.hasMultiple = false;
        } else {
          hostInformation[$(self.mirrorContainer[0]).attr('id')] = $(self.mirrorContainer[0]).data('json');
          $(self.ccmTarget).children().removeClass('selectedItem');
        }

        // prepare HTML before dropping
        $('#ccm-drop_cluster_group').addClass('modal-trigger');
        $('#ccm-cluster_creation_table_body').empty();

        // create host list that we will display in the modal
        const keys = Object.keys(hostInformation);
        for (const key of keys) {
          $('#ccm-cluster_creation_table_body')
            .append(self.cluster.buildHostElementForCollapsible(hostInformation[key], true));
        }

        // trigger the modal and end the drop event
        self.material.triggerModal($('#ccm-drop_cluster_group'), '#ccm-modal_drop_cluster_group');
        self.draggable.cancel(true);
      }
    });
  }

  /*
  * initate on drop in cluster event
  *
  * @param {string} targetId The id of the cluster
  * @param {object} clusterGroupActions The json with all the user actions
  * @param {object} masonry The masonry object
  */
  dropCluster (targetId, clusterGroupActions, masonry) {
    const self = this;
    this.draggable.on('drop', function (el, target, source, sibling) {
      self.mirrorContainer = $('.gu-mirror').first();
      const hostInformation = [];
      const isCcmCluster = $(target).attr('id') === targetId;

      if (isCcmCluster) {
        // handle drop actions depending on the number of host we are dragging
        if (self.hasMultiple) {
          // get the default, single dropped item
          $(self.mirrorContainer.children()).each(function () {
            hostInformation[$(this).attr('id')] = $(this).data('json');
          });

          // remove the remaining items from the DOM
          $('.selectedItem').removeClass('.selectedItem');
          self.hasMultiple = false;
        } else {
          hostInformation[$(self.mirrorContainer[0]).attr('id')] = $(self.mirrorContainer[0]).data('json');
          $(self.ccmSource).children().removeClass('selectedItem');
        }

        // update cluster group actions and save it in the object
        self.clusterGroupActions = self.cluster.addHostToCluster(hostInformation, $(target));
        self.cluster.saveClusterGroupActions(self.clusterGroupActions);

        // reposition cards if we drop host in an expanded cluster and end drop event
        masonry.masonry();
        self.draggable.cancel(true);
      }
    });
  }

  outClusterGroup () {
    this.draggable.on('out', function (el, container) {
      $('#ccm-drop_cluster_group').css({ 'border-color': '#ededed', color: '#ededed' });
    });
  }

  outCluster () {
    this.draggable.on('out', function (el, container) {
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

  initKeyEvent (ccmSource) {
    this.ccmSource = ccmSource;
    this.bindShiftPressEvent();
    this.bindMultiselectOnSource();
  }

  initDragula () {
    this.draggable = dragula(this.options);
  }
}
