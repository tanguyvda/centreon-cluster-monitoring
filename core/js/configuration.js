import CcmUtils from './ccm-utils.js';
import CcmMaterial from './ccm-material.js';
import CcmCluster from './ccm-cluster.js';
import CcmDragAndDrop from './ccm-dragAndDrop.js';
var clusterGroupActions = {};
var cluster = new CcmCluster(clusterGroupActions);

$(document).ready(function () {
  // document.querySelector('#ccm-save_cluster_group_button').addEventListener('click', createClusterGroupTest());
  loadClusterGroups();
  $(document).on('click', function (e) {
    // remove class selectedItem if click outside of the host list. Because of margin/padding it is much more intuitive
    // to not remove the selectedItem class if we click somewhere on the whole list. To unselect something from the list
    // people will tend to click outside of the list. This behaviour is better than having a random click unselect the
    // whole list because the click happened to be on the padding/marging of the parent div
    if (!$(e.target).is('.ccm-host') && !$(e.target).parent().is('.ccm-host') && !$(e.target).is('#ccm-host_list')) {
      $('.ccm-host').removeClass('selectedItem');
    }
  });
  $.ajax({
    url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      ccm_method: 'listHosts'
    }),
    success: function (data) {
      if (data) {
        for (const key in data) {
          cluster.buildHostElementForList(data, key);
          $('#ccm-host_list').append(cluster.buildHostElementForList(data, key));
        }
        const material = new CcmMaterial();
        material.buildTooltip('hostTooltip');
        material.buildModal('ccm-modal_drop_cluster_group');
        material.buildCollapsible('ccm-cluster_group_configuration_popup_collapsible');
        startSearchHost(data, material);
        const dragulaOptions = {
          invalid: function (el, handle) {
            if ($(el).hasClass('ccm-droppable_list')) {
              return true;
            }
          },
          revertOnSpill: true,
          copy: true
        };
        var drag = new CcmDragAndDrop($('#ccm-host_list'), $('#ccm-drop_cluster_group'), dragulaOptions, 'ClusterGroup', true);
        // drag.start();
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      console.log('very bad');
      console.log(error);
    }
  });

  function startSearchHost (data, material) {
    $('#ccm-search_host').change(function () {
      $.ajax({
        url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
        type: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
          ccm_method: 'searchList',
          data: data,
          fields: ['host_name', 'host_address'],
          search_value: $('#ccm-search_host').val()
        }),
        success: function (data) {
          $('#ccm-host_list').empty();
          for (const key in data) {
            cluster.buildHostElementForList(data, key);
            $('#ccm-host_list').append(cluster.buildHostElementForList(data, key));
          }
          material.buildTooltip('hostTooltip');
        },
        error: function (error) {
          console.log('very bad');
          console.log(error);
        }
      });
    });
  }

});



function enableDragula () {
  var ccmSource = $('#ccm-host_list');
  var ccmTarget = $('#ccm-drop_cluster_group');
  var ccmList = $('.ccm-droppable_list');
  var hasMultiple = false;
  var shiftIsPressed;
  var selectedItems;
  var mirrorContainer;

  const dragulaOptions = {
    invalid: function (el, handle) {
      if ($(el).hasClass('ccm-droppable_list')) {
        return true;
      }
    },
    revertOnSpill: true,
    copy: true
  };

  var drake = dragula([ccmSource[0], ccmTarget[0], ccmList[0]], dragulaOptions);

  drake.on('drag', (el) => {
  }).on('cloned', (clone, original, type) => {
    // dragging from host list to cluster group
    var isFromSource = $(original).parent().attr('id') === 'ccm-host_list';
    if (isFromSource) {
      // grab the mirror created by dragula
      mirrorContainer = $('.gu-mirror').first();
      // remove class selectedItem on created mirrors because they don't need it
      mirrorContainer.removeClass('selectedItem');
      // we add the row class to our mirror container so our children div stay inline instead of one under the other
      mirrorContainer.addClass('row');
      // get multi selected items
      selectedItems = $('.selectedItem');
      // do we have multiple items selected
      hasMultiple = selectedItems.length > 1 || (selectedItems.length === 1 &&  !$(original).hasClass('selectedItem'));
      if (hasMultiple) {
        // the gu-mirror div is a clone of the first element we drag, we remove unecessary classes to avoid visual artifacts
        $('.gu-mirror').removeClass('ccm-host col s12');
        // if we already dragged something from an unselected item, we add the class selectedItem
        $('.gu-transit').addClass('selectedItem');
        selectedItems = $('.selectedItem');
        // empty the mirror container, we are going to add in it our own items
        mirrorContainer.empty();
        // clone the selected items into the mirror container
        selectedItems.each(function (index) {
          // the item
          var item = $(this);
          // clone the item
          var mirror = item.clone(true);
          // remove the state classes
          mirror.removeClass('selectedItem gu-transit');
          // add the clone to the mirror container
          mirrorContainer.append(mirror);
          $(mirrorContainer).parent().addClass('row');
          // add drag state class to item
          item.addClass('gu-transit');
        });
      }
    } else {
      // clear all flags
      hasMultiple = false;
      if (selectedItems) {
        selectedItems.removeClass('selectedItem');
        selectedItems = $([]);
      }
      drake.cancel(true);
    }
  }).on('over', function (el, container, source) {
    // hovering over cluster group ?
    var isOverCcmClusterGroup = $(container).attr('id') === 'ccm-drop_cluster_group';
    if (isOverCcmClusterGroup) {
      $('#ccm-drop_cluster_group').css({"border-color": "#000", "color": "#000"});
    }
    selectedItems.css('display', 'none');
  }).on('drop', function (el, target, source, sibling) {
    // convert to jquery
    target = $(target);
    const hostInformation = [];
    // flag if dropped on cluster group
    var isCcmClusterGroup = target.attr('id') === 'ccm-drop_cluster_group';
    var isCcmCluster = target.hasClass('ccm-droppable_list');
    // var isCcmClusterChild = isCcmCluster.find('*');
    $('#ccm-drop_cluster_group').addClass('modal-trigger');
    // are we dropping multiple items
    if (hasMultiple) {
      // are we adding items to cluster group
      if (isCcmClusterGroup || isCcmCluster) {
        // get the default, single dropped item
        // var droppedItem = target.find('.selectedItem').first();
        $(mirrorContainer.children()).each(function () {
          hostInformation[$(this).attr('id')] = $(this).data('json');
        });

        if (isCcmClusterGroup) {
          const keys = Object.keys(hostInformation);
          $('#ccm-cluster_creation_table_body').empty();
          for (const key of keys) {
            $('#ccm-cluster_creation_table_body')
              .append(cluster.buildHostElementForCollapsible(hostInformation[key], true));
          }
          triggerModal($('#ccm-drop_cluster_group'), '#ccm-modal_drop_cluster_group');
        } else if (isCcmCluster) {
          clusterGroupActions = cluster.addHostToCluster(hostInformation, target);
        }
        // remove the remaining items from the dom
        $('.selectedItem').removeClass('.selectedItem');
        // clear flag
        hasMultiple = false;
        drake.cancel(true);
      } else { // keeping items on the source
        drake.cancel(true);
      }
    } else {
      const keys = Object.keys(hostInformation);
      hostInformation[$(mirrorContainer[0]).attr('id')] = $(mirrorContainer[0]).data('json');
      if (isCcmClusterGroup) {
        $('#ccm-cluster_creation_table_body').empty();
        for (const key of keys) {
          $('#ccm-cluster_creation_table_body')
            .append(cluster.buildHostElementForCollapsible(hostInformation[key], true));
        }
        triggerModal($('#ccm-drop_cluster_group'), '#ccm-modal_drop_cluster_group');
        ccmTarget.children().removeClass('selectedItem');
      } else if (isCcmCluster) {
        clusterGroupActions = cluster.addHostToCluster(hostInformation, target);
        ccmList.children().removeClass('selectedItem');
      }
      // if only one item has been selected, remove the selected item class
      drake.cancel(true);
    }
  }).on('cancel', function (el, container, source) {
  }).on('out', function (el, container) {
    $('#ccm-drop_cluster_group').css({'border-color': '#ededed', 'color': '#ededed'});
  }).on('moves', function (el, container, handle) {
    // for non draggable line breaks
    // return !$(el).is('hr');
  }).on('dragend', function () {
    // rebind click event handlers for the new layouts
    unbindMultiselectOnTarget();
    bindMultiselectOnSource();
    // remove state classes for multiple selections that may be back on the source
    if (selectedItems) {
      selectedItems.removeClass('gu-transit');
      selectedItems.css('display', '');
    }
  });

  // sets a global flag of whether the shift key is pressed
  function bindShiftPressEvent () {
    // set flag on
    $(document).keydown(function (event) {
      if (event.shiftKey) {
        shiftIsPressed = true;
      }
    });

    // set flag off
    $(document).keyup(function () {
      shiftIsPressed = false;
    });
  }

  // enables items on source to be multiselected with a 'shift + click'
  function bindMultiselectOnSource () {
    ccmSource.children().each((index, el) => {
      $(el).off('click');
      $(el).on('click', function () {
        if (shiftIsPressed) {
          $(this).toggleClass('selectedItem');
        }
      });

    });
  }

  // disables multiselect on items on the target
  function unbindMultiselectOnTarget () {
    ccmTarget.children().each((index, el) => {
      $(el).off('click');
    });
  }

  // initial bindings
  function init () {
    bindShiftPressEvent();
    bindMultiselectOnSource();
  }

  // start this
  init();
}

window.createClusterGroupTest = function () {
  const clusterGroupConfiguration = cluster.createClusterGroup();

  $('#ccm-cluster_creation_table_body > tr').each(function (index, tr) {
    clusterGroupConfiguration.clusters[0].hosts[index] = $(tr).data('json');
  });

  saveClusterGroup(clusterGroupConfiguration);
};

function saveClusterGroup (conf) {
  $.ajax({
    url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      ccm_method: 'saveClusterGroup',
      param: conf
    }),
    success: function (data) {
      if (data) {
        const material = new CcmMaterial();
        $('#ccm-close_modal')[0].click();
        const card = cluster.createClusterGroupCard(conf);
        $(card).insertAfter('#ccm-drop_cluster_group');
        material.buildTooltip('card-tooltipped-' + conf.cluster_group_name);
        material.buildCollapsible('ccm-cluster_group_' + conf.cluster_group_name);
        clusterGroupActions = cluster.initiateClusterGroupActions(conf.cluster_group_id);
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      const material = new CcmMaterial();
      material.toastError(error.responseText);
    }
  });
}

function loadClusterGroups () {
  $.ajax({
    url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      ccm_method: 'loadClusterGroups'
    }),
    success: function (data) {
      if (data) {
        const material = new CcmMaterial();
        $.each(data, function () {
          const card = cluster.createClusterGroupCard(this);
          $(card).insertAfter('#ccm-drop_cluster_group');
          material.buildTooltip('card-tooltipped-' + this.cluster_group_name);
          material.buildCollapsible('ccm-cluster_group_' + this.cluster_group_name);
          clusterGroupActions = cluster.initiateClusterGroupActions(this.cluster_group_id);
        });
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      const material = new CcmMaterial();
      material.toastError(error.responseText);
    }
  });
}

window.removeHost = function (el, clusterGroupId, clusterId, hostId) {
  clusterGroupActions = cluster.removeHost(el, clusterGroupId, clusterId, hostId);
}

window.removeCluster = function (el, clusterGroupId, clusterId) {
  clusterGroupActions = cluster.removeCluster(el, clusterGroupId, clusterId);
}

window.updateClusterGroup = function (clusterGroupId) {
  $.ajax({
    url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      ccm_method: 'updateClusterGroup',
      actions: clusterGroupActions[clusterGroupId]
    }),
    success: function (data) {
      if (data) {
        clusterGroupActions = cluster.resetClusterGroupActions(clusterGroupId);
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      const material = new CcmMaterial();
      material.toastError(error.responseText);
    }
  });
}

// {
//    cluster_group_id: {
//     delete: {
//       clusters: [12,2,36],
//       12: {
//         hosts: [13,14,15,16]
//       },
//      36: {
//        hosts: [13,14,15,16]
//      }
//     },
//     add: {
//       11: {
//           hosts: [48, 154, 454]
//         }
//     }
//   }
// }
