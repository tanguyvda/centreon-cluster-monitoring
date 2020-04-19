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

  /**
  * initiate on drag event
  */
  drag () {
    this.draggable.on('drag', el => {});
  }

  /**
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

  /**
  * initiate on over cluster group event
  */
  overClusterGroup () {
    const self = this;
    this.draggable.on('over', function (el, container, source) {
      const isOverCcmClusterGroup = $(container).attr('id') === 'ccm-drop_cluster_group';

      if (isOverCcmClusterGroup) {
        $('#ccm-drop_cluster_group').css({ 'border-color': '#000', color: '#000' });
        self.selectedItems.css('display', 'none');
      }
    });
  }

  /**
  * initiate on over cluster event
  *
  * @param {string} id Id of the element we hover
  */
  overCluster (id) {
    this.draggable.on('over', function (el, container, source) {
      const isOverCluster = $(container).attr('id') === id;

      if (isOverCluster) {
        $('#' + id).css({ color: 'red' });
      }
    });
  }

  /**
  * initiate on over create cluster event
  *
  * @param {string} id Id of the element we hover
  */
  overCreateCluster (id) {
    this.draggable.on('over', function (el, container, source) {
      const isOverCreateCluster = $(container).attr('id') === id;

      if (isOverCreateCluster) {
        $('#' + id).css({ 'border-color': '#000', color: '#000' });
      }
    });
  }

  /**
  * initate on drop in cluster group event
  *
  * @param {string} targetId The id of the cluster group drop area
  */
  dropClusterGroup (targetId) {
    const self = this;
    this.draggable.on('drop', function (el, target, source, sibling) {
      const isCcmClusterGroup = $(target).attr('id') === targetId;
      if (isCcmClusterGroup) {
        const hostInformation = self.prepareDrop();

        // prepare HTML before dropping
        $('#ccm-drop_cluster_group').addClass('modal-trigger');

        // reset form to default state before triggering it
        $('#ccm-cluster_creation_table_body').empty();
        $('#ccm-cluster_group_form_group_name').empty();
        $('#ccm-inherit_dt').prop('checked', true);
        $('#ccm-inherit_ack').prop('checked', true);
        $('#ccm-status_calculation_method').prop('checked', false);
        $('#ccm-cluster_group_form_cluster_name').empty();
        $('#ccm-cluster_group_form_cluster_wthreshold').empty();
        $('#ccm-cluster_group_form_cluster_cthreshold').empty();

        // create host list that we will display in the modal
        const keys = Object.keys(hostInformation);
        for (const key of keys) {
          $('#ccm-cluster_group_creation_table_body')
            .append(self.cluster.buildHostElementForCollapsible(hostInformation[key], true));
        }

        // trigger the modal and end the drop event
        self.material.triggerModal($('#ccm-drop_cluster_group'), '#ccm-modal_drop_cluster_group');
        self.draggable.cancel(true);
      }
    });
  }

  /**
  * initate on drop in cluster event
  *
  * @param {string} targetId The id of the cluster
  * @param {object} clusterGroupActions The json with all the user actions
  * @param {object} masonry The masonry object
  */
  dropCluster (targetId, clusterGroupActions, masonry) {
    const self = this;
    this.draggable.on('drop', function (el, target, source, sibling) {
      const isCcmCluster = $(target).attr('id') === targetId;

      if (isCcmCluster) {
        // handle drop actions depending on the number of host we are dragging
        const hostInformation = self.prepareDrop();

        // update cluster group actions and save it in the object
        self.clusterGroupActions = self.cluster.addHostToCluster(hostInformation, $(target));
        self.cluster.saveClusterGroupActions(self.clusterGroupActions);

        // reposition cards if we drop host in an expanded cluster and end drop event
        masonry.masonry();
        self.draggable.cancel(true);
      }
    });
  }

  /**
  * initiate on drop in cluster drop area event
  *
  * @param {string} targetId Id of the cluster drop area
  * @param {number} clusterGroupId Id number of the cluster group
  */
  dropCreateCluster (targetId, clusterGroupId) {
    const self = this;
    this.draggable.on('drop', function (el, target, source, sibling) {
      const isClusterDropArea = $(target).attr('id') === targetId;

      if (isClusterDropArea) {
        const hostInformation = self.prepareDrop();

        $('#' + targetId).addClass('modal-trigger');

        // reset modal parameters before triggering it
        $('#ccm-cluster_form_cluster_name').val('');
        $('#ccm-cluster_form_cluster_wthreshold').val('');
        $('#ccm-cluster_form_cluster_cthreshold').val('');
        $('#ccm-cluster_creation_table_body').empty();

        $('#ccm-modal_drop_cluster').data('cluster_group_id', clusterGroupId);

        // create host list that we will display in the modal
        const keys = Object.keys(hostInformation);

        for (const key of keys) {
          $('#ccm-cluster_creation_table_body')
            .append(self.cluster.buildHostElementForCollapsible(hostInformation[key], true));
        }

        // trigger the modal and end the drop event
        self.material.triggerModal($('#' + targetId), '#ccm-modal_drop_cluster');
        self.draggable.cancel(true);
      }
    });
  }

  /**
  * initiate on out of create new cluster group drop area
  *
  * @param {string} id Id of the create cluster group drop area
  */
  outClusterGroup () {
    this.draggable.on('out', function (el, container) {
      $('#ccm-drop_cluster_group').css({ 'border-color': '#ededed', color: '#ededed' });
    });
  }

  /**
  * initiate on out of existing cluster drop area
  *
  * @param {string} id Id of the existing cluster drop area
  */
  outCluster (id) {
    this.draggable.on('out', function (el, container) {
    });
  }

  /**
  * initiate on out of create new cluster drop area
  *
  * @param {string} id Id of the create cluster drop area
  */
  outCreateCluster (id) {
    this.draggable.on('out', function (el, container) {
      $('#' + id).css({ 'border-color': '#ededed', color: '#ededed' });
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

  /**
  * prepare elements before droping them
  *
  * @return {string} hostInformation details about the host
  */
  prepareDrop () {
    const self = this;
    const hostInformation = [];
    self.mirrorContainer = $('.gu-mirror').first();

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

    return hostInformation;
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
