/* global $ */
import CcmMaterial from './ccm-material.js';
import CcmCluster from './ccm-cluster.js';
import CcmDragAndDrop from './ccm-dragAndDrop.js';

// init masonry variable
var masonry = $('.masonry-grid').masonry({
  itemSelector: '.masonry-grid-item',
  percentPosition: true,
  columnWidth: '.grid-sizer'
});
// init material design object
var material = new CcmMaterial();
var materialInstance = {};

// init cluster object
var clusterGroupActions = {};
var cluster = new CcmCluster(clusterGroupActions);

// init drag and drop
var dragulaOptions = {
  invalid: function (el, handle) {
    if ($(el).hasClass('ccm-droppable_list')) {
      return true;
    }
  },
  revertOnSpill: true,
  copy: true
};
var drag = new CcmDragAndDrop(dragulaOptions, cluster);
drag.initDragula();

$(document).ready(function () {
  $(document).on('click', function (e) {
    // remove class selectedItem if click outside of the host list. Because of margin/padding it is much more intuitive
    // to not remove the selectedItem class if we click somewhere on the whole list. To unselect something from the list
    // people will tend to click outside of the list. This behaviour is better than having a random click unselect the
    // whole list because the click happened to be on the padding/marging of the parent div
    if (!$(e.target).is('.ccm-host') && !$(e.target).parent().is('.ccm-host') && !$(e.target).is('#ccm-host_list')) {
      $('.ccm-host').removeClass('selectedItem');
    }
  });

  // load host list
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
        // create the list of hosts
        for (const key in data) {
          cluster.buildHostElementForList(data, key);
          $('#ccm-host_list').append(cluster.buildHostElementForList(data, key));
        }

        cluster.handleHostListScroll();

        // create material component
        material.buildTooltip('hostTooltip');
        material.buildModal('ccm-modal_drop_cluster_group');
        material.buildModal('ccm-modal_drop_cluster');
        material.buildCollapsible('ccm-cluster_group_configuration_popup_collapsible');
        material.buildCollapsible('ccm-cluster_configuration_popup_collapsible');

        // enable search function for hosts
        startSearchHost(data, material);

        // now that hosts are loaded, enable drag from the host list to the new cluster group area
        drag.draggable.containers.push($('#ccm-host_list')[0], $('#ccm-drop_cluster_group')[0]);
        drag.initKeyEvent($('#ccm-host_list'));
        drag.drag();
        drag.cloned();
        drag.overClusterGroup();
        drag.dropClusterGroup('ccm-drop_cluster_group');
        drag.outClusterGroup();
        drag.dragend();

        // display saved cluster groups
        loadClusterGroups();
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      console.log('very bad');
      console.log(error);
    }
  });

  /**
  * search hosts in the gathered list
  *
  * @param {object} data The host list
  */
  function startSearchHost (data) {
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
          // remove every host from the list
          $('#ccm-host_list').empty();

          // add each found host in the list
          for (const key in data) {
            cluster.buildHostElementForList(data, key);
            $('#ccm-host_list').append(cluster.buildHostElementForList(data, key));
          }

          drag.initKeyEvent($('#ccm-host_list'));
          material.buildTooltip('hostTooltip');

          cluster.handleHostListScroll();
        },
        error: function (error) {
          console.log('very bad');
          console.log(error);
        }
      });
    });
  }
});

window.createClusterGroupButton = function () {
  // create cluster group configuration
  const clusterGroupConfiguration = cluster.createClusterGroup();

  // add host data in the cluster group
  $('#ccm-cluster_group_creation_table_body > tr').each(function (index, tr) {
    clusterGroupConfiguration.clusters[0].hosts[index] = $(tr).data('json');
  });

  // save cluster group in database
  saveClusterGroup(clusterGroupConfiguration);
};

window.createClusterButton = function () {
  // create cluster configuration
  const clusterConfiguration = cluster.createCluster();

  // add host data in the cluster
  $('#ccm-cluster_creation_table_body > tr').each(function (index, tr) {
    clusterConfiguration.clusters[0].hosts[index] = $(tr).data('json');
  });

  // save cluster in database
  saveCluster(clusterConfiguration);
};

/**
* save a cluster group in the database
*
* @param {object} conf The cluster group configuration
*/
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
    success: function (clusterGroupId) {
      if (clusterGroupId) {
        // close the cluster group creation popup
        $('#ccm-close_cluster_group_modal')[0].click();

        // create the html card and display it
        const card = cluster.createClusterGroupCard(conf, clusterGroupId);
        $('.ccm-cluster_group_wrapper').append(card);
        // create material object for our card
        material.buildTooltip('card-tooltipped-' + clusterGroupId);
        material.buildCollapsible('ccm-cluster_group_' + clusterGroupId);

        // initiate the action list that we can do on the whole cluster group
        clusterGroupActions = cluster.initiateClusterGroupActions(clusterGroupId);

        masonry.masonry('appended', $('#ccm_cluster_group_card_' + clusterGroupId));
        masonry.masonry();
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      material.toastError(error.responseText);
    }
  });
}

/**
* save cluster in database
*
* @param {object} conf The configuration of the cluster
*/
function saveCluster (conf) {
  $.ajax({
    url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      ccm_method: 'saveCluster',
      param: conf
    }),
    success: function (data) {
      if (data) {
        // close the cluster creation popup
        $('#ccm-close_cluster_modal')[0].click();

        cluster.addClusterToClusterGroup(conf);

        drag.draggable.containers.push($('#ccm-li_' + conf.cluster_group_id + '_' + conf.clusters[0].cluster_name)[0]);
        drag.overCluster('ccm-li_' + conf.cluster_group_id + '_' + conf.clusters[0].cluster_name);
        drag.dropCluster('ccm-li_' + conf.cluster_group_id + '_' + conf.clusters[0].cluster_name, clusterGroupActions, masonry);
        drag.outCluster('ccm-li_' + conf.cluster_group_id + '_' + conf.clusters[0].cluster_name);
        console.log(drag);
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      material.toastError(error.responseText);
    }
  });
}

/**
* Load cluster groups that are saved in the database
*/
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
        // for each found cluster group in the database...
        $.each(data, function (index, value) {
          // create an html card
          const clusters = this.clusters;
          const clusterGroupId = this.cluster_group_id;
          const card = cluster.createClusterGroupCard(this, this.cluster_group_id);

          // display the card
          $('.ccm-cluster_group_wrapper').append(card);

          // add material component to the card
          material.buildTooltip('card-tooltipped-' + clusterGroupId);
          materialInstance = material.buildCollapsible('ccm-cluster_group_' + clusterGroupId);

          // initiate the list of actions users will do (remove host from cluster, remove cluster from cluster group...)
          clusterGroupActions = cluster.initiateClusterGroupActions(this.cluster_group_id);

          // enable dropping host in a cluster
          $.each(clusters, function () {
            // make each cluster in a cluster group a possible drop area
            drag.draggable.containers.push($('#ccm-li_' + clusterGroupId + '_' + this.cluster_name)[0]);
            drag.overCluster('ccm-li_' + clusterGroupId + '_' + this.cluster_name);
            drag.dropCluster('ccm-li_' + clusterGroupId + '_' + this.cluster_name, clusterGroupActions, masonry);
            drag.outCluster('ccm-li_' + clusterGroupId + '_' + this.cluster_name);

            // add drop possibilities to the create cluster drop area
            drag.draggable.containers.push($('#ccm-cluster_drop_area_' + clusterGroupId)[0]);
            drag.overCreateCluster('ccm-cluster_drop_area_' + clusterGroupId);
            drag.dropCreateCluster('ccm-cluster_drop_area_' + clusterGroupId, clusterGroupId);
            drag.outCreateCluster('ccm-cluster_drop_area_' + clusterGroupId);
          });

          // add cluster group card to the masonry object and refresh card positioning
          masonry.masonry('appended', $('#ccm_cluster_group_card_' + clusterGroupId));
          masonry.masonry();
        });

        // update each collapsible in every cluster group so that masonry is activated when collpasible expends or reduces
        $.each(data, function () {
          material.updateCollapsible('ccm-cluster_group_' + this.cluster_group_id, masonry, materialInstance);
        });
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      material.toastError(error.responseText);
    }
  });
}

// remove host from cluster
window.removeHost = function (el, clusterGroupId, clusterId, hostId) {
  clusterGroupActions = cluster.removeHost(el, clusterGroupId, clusterId, hostId);
};

// remove cluster from cluster group
window.removeCluster = function (el, clusterGroupId, clusterId) {
  clusterGroupActions = cluster.removeCluster(el, clusterGroupId, clusterId);
};

// handles adds and deletions in a cluster group
window.updateClusterGroup = function (clusterGroupId) {
  clusterGroupActions = cluster.getClusterGroupActions();
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
      material.toastError(error.responseText);
    }
  });
};
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
