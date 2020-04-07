import CcmUtils from './ccm-utils.js';
import CcmMaterial from './ccm-material.js';
import CcmCluster from './ccm-cluster.js';
import CcmDragAndDrop from './ccm-dragAndDrop.js';
var clusterGroupActions = {};
var cluster = new CcmCluster(clusterGroupActions);
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
        drag.draggable.containers.push($('#ccm-host_list')[0], $('#ccm-drop_cluster_group')[0]);
        drag.initKeyEvent($('#ccm-host_list'));
        drag.drag();
        drag.cloned();
        drag.overClusterGroup();
        drag.dropClusterGroup('ccm-drop_cluster_group');
        drag.outClusterGroup();
        drag.dragend();
        loadClusterGroups();;
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
          drag.initKeyEvent($('#ccm-host_list'));
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
          const clusters = this.clusters;
          const clusterGroupId = this.cluster_group_id
          const dragulaOptions = {
            invalid: function (el, handle) {
              if ($(el).hasClass('ccm-droppable_list')) {
                return true;
              }
            },
            revertOnSpill: true,
            copy: true
          };
          $(card).insertAfter('#ccm-drop_cluster_group');
          material.buildTooltip('card-tooltipped-' + this.cluster_group_name);
          material.buildCollapsible('ccm-cluster_group_' + this.cluster_group_name);
          clusterGroupActions = cluster.initiateClusterGroupActions(this.cluster_group_id);
          $.each(clusters, function () {
            drag.draggable.containers.push($('#ccm-li_' + clusterGroupId + '_' + this.cluster_name)[0]);
            drag.overCluster('ccm-li_' + clusterGroupId + '_' + this.cluster_name);
            drag.dropCluster('ccm-li_' + clusterGroupId + '_' + this.cluster_name, clusterGroupActions);
            drag.outCluster('ccm-li_' + clusterGroupId + '_' + this.cluster_name);
          });
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
};

window.removeCluster = function (el, clusterGroupId, clusterId) {
  clusterGroupActions = cluster.removeCluster(el, clusterGroupId, clusterId);
};

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
      const material = new CcmMaterial();
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
