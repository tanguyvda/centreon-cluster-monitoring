var clusterGroupAction = {};

$(document).ready(function () {
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
          buildHostList(data, key);
        }
        buildTooltip('.hostTooltip');
        buildModal('ccm-modal_drop_cluster_group');
        buildCollapsible('ccm-cluster_group_configuration_popup_collapsible');
        startSearchHost(data);
        enableDragula();
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      console.log('very bad');
      console.log(error);
    }
  });
});


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
        $('#ccm-host_list').empty();
        for (const key in data) {
          buildHostList(data, key);
        }
        buildTooltip('.hostTooltip');
      },
      error: function (error) {
        console.log('very bad');
        console.log(error);
      }
    });
  });
}

function buildHostList (hostList, key) {
  $('#ccm-host_list').append(
    '<div id="' + key + '_' + hostList[key].host_id + '_' + hostList[key].host_name + '" class="ccm-host col s12"' +
      'data-json="' + htmlEscape(JSON.stringify(hostList[key])) + '">' +
        '<div class="col s1 m1 l1 xl1 ccm-host_icon hide-on-small-only">' +
          '<img class="ico-18" src="' + hostList[key].icon + '"/>' +
        '</div>' +
        '<div class="col s6 m6 l9 xl9 ccm-host_name">' +
          hostList[key].host_name +
        '</div>' +
        '<div class="col s1 m1 l1 xl1 ccm-icon_wrapper">' +
          '<i class="material-icons prefix ccm-info_icon hostTooltip"' +
            'data-position="bottom"' +
            'data-tooltip="' +
              'host name: ' + hostList[key].host_name +
              '<br>host alias: ' + hostList[key].host_alias +
              '<br>host address: ' + hostList[key].host_address +
              '<br>host comment: ' + hostList[key].host_comment +
              '">info_outline</i>' +
        '</div>' +
    '</div>'
  );
}

function buildTooltip (className) {
  const elems = document.querySelectorAll(className);
  M.Tooltip.init(elems);
}

function buildModal (id) {
  const elems = document.querySelectorAll('#' + id);
  M.Modal.init(elems);
}

function buildCollapsible (id) {
  const elems = document.querySelectorAll('#' + id);
  M.Collapsible.init(elems);
}

function buildCollapsibleHostList (hostInformation) {
  $('#ccm-cluster_creation_table_body').empty();
  const keys = Object.keys(hostInformation);
  for (const key of keys) {
    $('#ccm-cluster_creation_table_body').append(
      '<tr data-json="' + htmlEscape(JSON.stringify(hostInformation[key])) + '">' +
      '<td>' + hostInformation[key].host_name + '</td><td>' +
      hostInformation[key].host_alias + '</td><td>' +
      hostInformation[key].host_address + '</td><td>' +
      $('<div/>').text(hostInformation[key].host_comment).html() + '</td><td>X</td></tr>'
    );
  }
}

function enableDragula () {
  var ccmSource = $('#ccm-host_list');
  var ccmTarget = $('#ccm-drop_cluster_group');
  var hasMultiple = false;
  var shiftIsPressed;
  var selectedItems;
  var mirrorContainer;

  var drake = dragula([ccmSource[0], ccmTarget[0]], {
    revertOnSpill: true,
    copy: true
  });

  drake.on('drag', (el) => {
    console.log('drag');
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
    var isOverTarget = $(container).attr('id') === 'ccm-drop_cluster_group';
    if (isOverTarget) {
      $('#ccm-drop_cluster_group').css({"border-color": "#000", "color": "#000"});
    }
    selectedItems.css('display', 'none');
  }).on('drop', function (el, target, source, sibling) {
    // convert to jquery
    target = $(target);
    const hostInformation = [];
    // flag if dropped on cluster group
    var isTarget = target.attr('id') === 'ccm-drop_cluster_group';
    $('#ccm-drop_cluster_group').addClass('modal-trigger');
    // are we dropping multiple items
    if (hasMultiple) {
      // are we adding items to cluster group
      if (isTarget) {
        // get the default, single dropped item
        // var droppedItem = target.find('.selectedItem').first();
        $(mirrorContainer.children()).each(function () {
          hostInformation[$(this).attr('id')] = $(this).data('json');
        });
        buildCollapsibleHostList(hostInformation);
        triggerModal();
        // remove the remaining items from the dom
        $('.selectedItem').removeClass('.selectedItem');
        // clear flag
        hasMultiple = false;
        drake.cancel(true);
      } else { // keeping items on the source
        drake.cancel(true);
      }
    } else {
      hostInformation[$(mirrorContainer[0]).attr('id')] = $(mirrorContainer[0]).data('json');
      buildCollapsibleHostList(hostInformation);
      triggerModal();
      // if only one item has been selected, remove the selected item class
      ccmTarget.children().removeClass('selectedItem');
      drake.cancel(true);
    }
  }).on('cancel', function (el, container, source) {
    console.log('cancel');
  }).on('out', function (el, container) {
    $('#ccm-drop_cluster_group').css({"border-color": "#ededed", "color": "#ededed"});
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
    $(document).keydown(function(event){
      if(event.shiftKey)
          shiftIsPressed = true;
    });

    // set flag off
    $(document).keyup(function(){
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

function htmlEscape (str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\//g, '&#x2F');
}

// I needed the opposite function today, so adding here too:
function htmlUnescape (str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#x2F/g, '/');
}

function createClusterGroup () {

  const clusterGroupName = $('#ccm-cluster_group_form_group_name').val();
  const inheritAck = ($('#ccm-inherit_ack').is(':checked')) ? true : false;
  const inheritDt = ($('#ccm-inherit_dt').is(':checked')) ? true : false;
  const statusCalculationMethod = ($('#ccm-status_calculation_method').is(':checked')) ? true : false;
  const clusterName = $('#ccm-cluster_group_form_cluster_name').val();
  const warningThreshold = $('#ccm-cluster_group_form_cluster_wthreshold').val();
  const criticalThreshold = $('#ccm-cluster_group_form_cluster_cthreshold').val();

  if (testWhiteSpace(clusterGroupName) || testWhiteSpace(clusterName)) {
    return toastError("You can't have white space in your cluster group name or your cluster name");
  }

  const clusterGroupConfiguration = {
    cluster_group_name: clusterGroupName,
    statusCalculation: {
      inherit_downtime: inheritDt,
      inherit_ack: inheritAck,
      ignore_services: statusCalculationMethod
    },
    clusters: [{
      cluster_name: clusterName,
      warning_threshold: warningThreshold,
      critical_threshold: criticalThreshold,
      hosts: []
    }]
  };

  $('#ccm-cluster_creation_table_body > tr').each(function (index, tr) {
    clusterGroupConfiguration.clusters[0].hosts[index] = $(tr).data('json');
  });

  saveClusterGroup(clusterGroupConfiguration);
}

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
        $('#ccm-close_modal')[0].click();
        console.log('on close');
        displayClusterGroup(conf);
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      toastError(error.responseText);
    }
  });
}

function triggerModal () {
  $('#ccm-drop_cluster_group').attr('href', '#ccm-modal_drop_cluster_group');
  $('#ccm-drop_cluster_group')[0].click();
  $('#ccm-drop_cluster_group').removeAttr('href');
  $('#ccm-drop_cluster_group').removeClass('modal-trigger')
}

function toastError (error) {
  const toast = '<span>' + error + '</span><button class="btn-flat toast-action" onClick="dismissToast()">Dismiss</button>';
  M.toast({html: toast});
}

function dismissToast () {
  M.Toast.dismissAll();
}

function loadClusterGroups () {
  $.ajax({
    url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      ccm_method: 'loadClusterGroups',
    }),
    success: function (data) {
      if (data) {
        $.each(data, function () {
          displayClusterGroup(this);
        });
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      toastError(error.responseText);
    }
  });
}

function displayClusterGroup (conf) {
  let clusterHtml = '';
  let hostHtml = '';
  const clusterGroupId = conf.cluster_group_id;
  $.each(conf.clusters, function () {
    const clusterId = this.cluster_id;
    $.each(this.hosts, function () {
      hostHtml += '<tr data-cluster_group_id="' + clusterGroupId + '" data-cluster_id="' + clusterId +
        '" data-host_id="' + this.host_id + '"><td>' + this.host_name + '</td>' +
        '<td>' +
          '<i class="material-icons" onClick="removeHost(this, ' +
          clusterGroupId + ',' + clusterId + ', ' + this.host_id + ')">highlight_off</i>' +
        '</td></tr>';
    });
    clusterHtml += '<li>' +
      '<div class="collapsible-header" style="color: grey;" data-cluster_group_id="' + clusterGroupId +
        '" data-cluster_id="' + this.cluster_id + '">' + this.cluster_name +
        '<i class="material-icons" onClick="removeCluster(this, ' + clusterGroupId + ',' + clusterId +
          ')">highlight_off</i></div>' +
      '<div class="collapsible-body">' +
        '<table>' +
          '<thead>' +
            '<tr>' +
              '<th>Host name</th>' +
              '<th>Remove</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' + hostHtml + '</tbody>' +
        '</table>' +
      '</div>' +
    '</li>';
  });

  const card = '<div class="col s12 m6 l6 xl3 ccm-flexbox_card" data-cluster_group_id="' + clusterGroupId + '">' +
    '<div class="card blue-grey darken-1">' +
      '<div class="card-content white-text">' +
        '<span class="card-title card-tooltipped-' + conf.cluster_group_name + '" data-position="top" data-tooltip="' +
          conf.cluster_group_name + '">' + conf.cluster_group_name + '</span>' +
        '<ul id="ccm-cluster_group_' + conf.cluster_group_name + '" class="collapsible">' +
          clusterHtml +
        '</ul>' +
      '</div>' +
      '<div class="card-action">' +
        '<a href="#" onClick="updateClusterGroup(' + clusterGroupId + ')">SAVE</a>' +
      '</div>' +
    '</div>' +
  '</div>';
  $(card).insertAfter('#ccm-drop_cluster_group');
  buildTooltip('.card-tooltipped-' + conf.cluster_group_name);
  buildCollapsible('ccm-cluster_group_' + conf.cluster_group_name);

  clusterGroupAction[clusterGroupId] = {
    delete: {
      clusters: []
    },
    add: {}
  };
}

function testWhiteSpace (string) {
  return /\s/g.test(string);
}

function removeHost (el, clusterGroupId, clusterId, hostId) {
  $(el).closest('tr').remove();
  if (!(clusterId in clusterGroupAction[clusterGroupId].delete)) {
    clusterGroupAction[clusterGroupId].delete[clusterId] = {};
  }
  if (!('hosts' in clusterGroupAction[clusterGroupId].delete[clusterId])) {
    clusterGroupAction[clusterGroupId].delete[clusterId].hosts = [];
  }
  clusterGroupAction[clusterGroupId].delete[clusterId].hosts.push(hostId);
  console.log(clusterGroupAction);
}

function removeCluster (el, clusterGroupId, clusterId) {
  $(el.closest('li').remove());
  clusterGroupAction[clusterGroupId].delete.clusters.push(clusterId);
}

function updateClusterGroup (clusterGroupId) {
  console.log('before');
  console.log(clusterGroupAction);
  $.ajax({
    url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
    type: 'POST',
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({
      ccm_method: 'updateClusterGroup',
      actions: clusterGroupAction[clusterGroupId]
    }),
    success: function (data) {
      if (data) {
        clusterGroupAction[clusterGroupId] = {
          delete: {
            clusters: []
          },
          add: {}
        };
        console.log('after');
        console.log(clusterGroupAction);
      } else {
        console.log('not good');
      }
    },
    error: function (error) {
      toastError(error.responseText);
    }
  });
}
//
// {
//    'cluster_group_id': {
//     'delete': {
//       'clusters': [12,2,36],
//       '12': {
//         'hosts': [13,14,15,16]
//       },
//      '36': {
//
// }
//     },
//     'add': {
//       'cluster_id': 13,
//       'hosts_id': [118, 190, 132]
//     }
//   }
// }
