/* global $ */
import CcmUtils from './ccm-utils.js';
import CcmMaterial from './ccm-material.js';

/** @class CcmCluster handles cluster objects */
export default class CcmCluster {
  /**
  * Creates an instance of CcmCluster
  *
  * @param {object} clusterGroupActions The json with the actions for the cluster groups
  */
  constructor (clusterGroupActions) {
    this.utils = new CcmUtils();
    this.material = new CcmMaterial();
    this.clusterGroupActions = clusterGroupActions;
  }

  /**
  * Creates a host list
  *
  * @param {object} hostList The list of hosts
  * @param {string} key The index key
  * @return {element} hostElement The html element for the host
  */
  buildHostElementForList (hostList, key) {
    const hostElement = `<div id="${key}_${hostList[key].host_id}" class="ccm-host col s12"` +
      `data-json="${this.utils.htmlEscape(JSON.stringify(hostList[key]))}">` +
        '<div class="col s1 m1 l1 xl1 ccm-host_icon hide-on-small-only">' +
          `<img class="ico-18" src="${hostList[key].icon}"/>` +
        '</div>' +
        `<div class="col s6 m6 l9 xl9 ccm-host_name">${hostList[key].host_name}</div>` +
        '<div class="col s1 m1 l1 xl1 ccm-icon_wrapper">' +
          '<i class="material-icons prefix ccm-info_icon hostTooltip" data-position="bottom"' +
            'data-tooltip="' +
              `host name: ${hostList[key].host_name}` +
              `<br>host alias: ${hostList[key].host_alias}` +
              `<br>host address: ${hostList[key].host_address}` +
              `<br>host comment: ${hostList[key].host_comment}` +
              '">info_outline</i>' +
        '</div>' +
      '</div>';

    return hostElement;
  }

  /**
  * add host information for collapsible object
  *
  * @param {object} hostInformation The host information data
  * @param {bool} extendedInformations Display host extendedInformations
  * @return {element} hostElement host html element for collapsible
  */
  buildHostElementForCollapsible (hostInformation, extendedInformations) {
    let hostElement = `<tr data-json="${this.utils.htmlEscape(JSON.stringify(hostInformation))}">` +
      `<td>${hostInformation.host_name}</td>`;

    if (extendedInformations) {
      hostElement += `<td>${hostInformation.host_alias}</td>` +
        `<td>${hostInformation.host_address}</td>` +
        `<td>${hostInformation.host_comment}</td>` +
        `<td>${$('<div/>').text(hostInformation.host_comment).html()}</td>`;
    }

    hostElement += '<td>X</td>';
    return hostElement;
  }

  /**
  * create the cluster group configuration
  *
  * @return {object} clusterGroupConfiguration The json configuration of the cluster group
  * @return {toast} Error if there are white spaces in cluster group or cluster name
  */
  createClusterGroup () {
    const self = this;
    const clusterGroupName = $('#ccm-cluster_group_form_group_name').val();
    const inheritAck = ($('#ccm-inherit_ack').is(':checked')) || false;
    const inheritDt = ($('#ccm-inherit_dt').is(':checked')) || false;
    const statusCalculationMethod = ($('#ccm-status_calculation_method').is(':checked')) || false;
    const clusterName = $('#ccm-cluster_group_form_cluster_name').val();
    const warningThreshold = $('#ccm-cluster_group_form_cluster_wthreshold').val();
    const criticalThreshold = $('#ccm-cluster_group_form_cluster_cthreshold').val();

    // if there are white space in names it's going to break our class/id naming
    if (self.utils.testWhiteSpace(clusterGroupName) || self.utils.testWhiteSpace(clusterName)) {
      return self.material.toastError("You can't have white space in your cluster group name or your cluster name");
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

    return clusterGroupConfiguration;
  }

  /**
  * create the cluster configuration
  *
  * @return {object} clusterConfiguration The json configuration of the cluster
  * @return {toast} Error if there are white spaces in cluster name
  */
  createCluster () {
    const self = this;
    const clusterName = $('#ccm-cluster_form_cluster_name').val();
    const warningThreshold = $('#ccm-cluster_form_cluster_wthreshold').val();
    const criticalThreshold = $('#ccm-cluster_form_cluster_cthreshold').val();
    const clusterGroupId = $('#ccm-modal_drop_cluster').data('cluster_group_id');

    if (self.utils.testWhiteSpace(clusterName)) {
      return self.material.toastError("You can't have white space in your cluster name");
    }

    const clusterConfiguration = {
      cluster_group_id: clusterGroupId,
      clusters: [{
        cluster_name: clusterName,
        warning_threshold: warningThreshold,
        critical_threshold: criticalThreshold,
        hosts: []
      }]
    };

    return clusterConfiguration;
  }

  /**
  * create a cluster group card
  *
  * @param {object} conf The configuration of a cluster group
  * @return {element} card The card html element for a cluster group
  */
  createClusterGroupCard (conf) {
    let clusterHtml = '';
    let hostHtml = '';
    const clusterGroupId = conf.cluster_group_id;
    $.each(conf.clusters, function () {
      const clusterId = this.cluster_id;

      // for each host in each cluster we create the html part to display hosts
      $.each(this.hosts, function () {
        hostHtml += `<tr data-cluster_group_id="${clusterGroupId}" data-cluster_id="${clusterId}" ` +
          `data-host_id="${this.host_id}"><td>${this.host_name}</td>` +
          '<td><i class="material-icons" onClick="removeHost(this,' +
            `${clusterGroupId},${clusterId},${this.host_id})">highlight_off</i></td></tr>`;
      });

      // for each cluster in the cluster group we create the html part to display the cluster
      clusterHtml += `<li id="ccm-li_${clusterGroupId}_${this.cluster_name}" class="ccm-droppable_list">` +
        `<div class="collapsible-header" style="color: grey;" data-cluster_group_id="${clusterGroupId}" ` +
          `data-cluster_id="${this.cluster_id}">${this.cluster_name}` +
          `<i class="material-icons" onClick="removeCluster(this,${clusterGroupId},${clusterId}` +
          ')">highlight_off</i></div>' +
        '<div class="collapsible-body">' +
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>Host name</th>' +
                '<th>Remove</th>' +
              '</tr>' +
            '</thead>' +
            `<tbody>${hostHtml}</tbody>` +
          '</table>' +
        '</div>' +
      '</li>';
    });

    // we create the cluster group card
    const card = `<div id="ccm_cluster_group_card_${clusterGroupId}" ` +
      `class="col s12 m6 l6 xl4 ccm-flexbox_card masonry-grid-item" data-cluster_group_id="${clusterGroupId}">` +
      '<div class="card">' +
        '<div class="card-content white-text">' +
          `<span class="card-title card-tooltipped-${conf.cluster_group_name}" data-position="top" ` +
            `data-tooltip="${conf.cluster_group_name}">${conf.cluster_group_name}</span>` +
          `<ul id="ccm-cluster_group_${conf.cluster_group_id}" class="collapsible">${clusterHtml}</ul>` +
        `<div id="ccm-cluster_drop_area_${clusterGroupId}" class="ccm-drop_only_area valign-wrapper">` +
        '<p class="center-align">DROP YOUR HOSTS HERE<p></div></div>' +
        '<div class="card-action">' +
          `<a href="#" onClick="updateClusterGroup(${clusterGroupId})">SAVE</a>` +
        '</div>' +
      '</div>' +
    '</div>';

    // createClusterDropArea(clusterGroupId);
    return card;
  }

  /**
  * add a new cluster in a cluster card
  *
  * @param {object} conf The configuration of the cluster
  */
  addClusterToClusterGroup (conf) {
    let clusterHtml = '';
    let hostHtml = '';
    const clusterGroupId = conf.cluster_group_id;
    $.each(conf.clusters, function () {
      const clusterId = this.cluster_id;

      // for each host in each cluster we create the html part to display hosts
      $.each(this.hosts, function () {
        hostHtml += `<tr data-cluster_group_id="${clusterGroupId}" data-cluster_id="${clusterId}" ` +
          `data-host_id="${this.host_id}"><td>${this.host_name}</td>` +
          '<td><i class="material-icons" onClick="removeHost(this,' +
            `${clusterGroupId},${clusterId},${this.host_id})">highlight_off</i></td></tr>`;
      });

      // for each cluster in the cluster group we create the html part to display the cluster
      clusterHtml += `<li id="ccm-li_${clusterGroupId}_${this.cluster_name}" class="ccm-droppable_list">` +
        `<div class="collapsible-header" style="color: grey;" data-cluster_group_id="${clusterGroupId}" ` +
          `data-cluster_id="${this.cluster_id}">${this.cluster_name}` +
          `<i class="material-icons" onClick="removeCluster(this,${clusterGroupId},${clusterId}` +
          ')">highlight_off</i></div>' +
        '<div class="collapsible-body">' +
          '<table>' +
            '<thead>' +
              '<tr>' +
                '<th>Host name</th>' +
                '<th>Remove</th>' +
              '</tr>' +
            '</thead>' +
            `<tbody>${hostHtml}</tbody>` +
          '</table>' +
        '</div>' +
      '</li>';
    });

    $('#ccm-cluster_group_' + clusterGroupId).append(clusterHtml);
  }

  /**
  * reset the json that contains actions for a cluster group
  *
  * @param {number} clusterGroupId The cluster group id we want to reset the actions
  * @return {object} this.clusterGroupActions The actions for the cluster groups with reseted actions for the cluster group
  */
  resetClusterGroupActions (clusterGroupId) {
    this.clusterGroupActions[clusterGroupId] = {
      delete: {
        clusters: []
      },
      add: {}
    };

    return this.clusterGroupActions;
  }

  /**
  * initiate the json that contains actions for a cluster group
  *
  * @param {number} clusterGroupId The cluster group id we want to reset the actions
  * @return {object} clusterGroupActions The actions for the cluster groups with reseted actions for the cluster group
  */
  initiateClusterGroupActions (clusterGroupId) {
    return this.resetClusterGroupActions(clusterGroupId);
  }

  /**
  * Add a host to a cluster
  *
  * @param {object} hostInformation The json with the host information
  * @param {element} cluster The cluster to which we have to add the host
  * @return {object} self.clusterGroupActions The new actions for the cluster groups
  */
  addHostToCluster (hostInformation, cluster) {
    const self = this;
    const collapsibleHeader = $(cluster[0]).find('div.collapsible-header');
    const clusterId = $(collapsibleHeader).data('cluster_id');
    const clusterGroupId = $(collapsibleHeader).data('cluster_group_id');
    const tbody = $(cluster[0]).find('div.collapsible-body').children().first().children().eq(1);
    const keys = Object.keys(hostInformation);

    for (const key of keys) {
      if (self.checkHostInCluster(hostInformation[key].host_id, $(tbody))) {
        self.material.toastError(hostInformation[key].host_name + ' is already in the cluster');
      } else {
        // add the host in the html
        $(tbody).append(`<tr data-cluster_group_id="${clusterGroupId}" data-cluster_id="${clusterId}" ` +
          `data-host_id="${hostInformation[key].host_id}"><td>${hostInformation[key].host_name}</td>` +
          '<td>' +
          `<i class="material-icons"
            onClick="removeHost(this,${clusterGroupId},${clusterId},${hostInformation[key].host_id})">highlight_off` +
          '</i></td></tr>'
        );

        // add the cluster in the action list
        if (!(clusterId in self.clusterGroupActions[clusterGroupId].add)) {
          self.clusterGroupActions[clusterGroupId].add[clusterId] = {};
        }

        // add the hosts section for the action on the cluster
        if (!('hosts' in self.clusterGroupActions[clusterGroupId].add[clusterId])) {
          self.clusterGroupActions[clusterGroupId].add[clusterId].hosts = [];
        }

        // add the host to the list of hosts that we need to put in the cluster
        self.clusterGroupActions[clusterGroupId].add[clusterId].hosts.push(hostInformation[key].host_id);
      }
    }

    return self.clusterGroupActions;
  }

  /**
  * check if host is already in the cluster
  *
  * @param {string} hostId The host id that we need to check
  * @param {element} element The html element whose children are hosts
  * @eturn {bool} true if host is one of the children of element
  */
  checkHostInCluster (hostId, element) {
    let exist = false;

    element.children().each(function () {
      if ($(this).data('host_id') === Number(hostId)) {
        exist = true;
      }
    });

    return exist;
  }

  /**
  * remove a cluster from a cluster group
  *
  * @param {element} element The html element that contains the <li> element refering to the cluster
  * @param {string} clusterGroupId The cluster group id of the cluster group to which our cluster is associated
  * @param {string} clusterId The cluster id of the cluster that we want to remove
  * @return {object} this.clusterGroupActions The new actions for the cluster groups
  */
  removeCluster (element, clusterGroupId, clusterId) {
    // remove html element that is used to display our cluster
    $(element.closest('li').remove());
    // add the delete action in our json
    this.clusterGroupActions[clusterGroupId].delete.clusters.push(clusterId);

    return this.clusterGroupActions;
  }

  /**
  * remove a host from a cluster
  *
  * @param {element} element The html element that contains the <tr> element refering to the host
  * @param {string} clusterGroupId The cluster group id of the cluster group to which our host is associated
  * @param {string} clusterId The cluster id of the cluster to which our host is associated
  * @param {string} hostId The host id of the host that we want to remove
  * @return {object} this.clusterGroupActions The new actions for the cluster groups
  */
  removeHost (element, clusterGroupId, clusterId, hostId) {
    const self = this;
    $(element).closest('tr').remove();
    // add the cluster id part in the "to delete" actions
    if (!(clusterId in self.clusterGroupActions[clusterGroupId].delete)) {
      self.clusterGroupActions[clusterGroupId].delete[clusterId] = {};
    }

    // add the hosts part in the "to delete" actions of our cluster
    if (!('hosts' in self.clusterGroupActions[clusterGroupId].delete[clusterId])) {
      self.clusterGroupActions[clusterGroupId].delete[clusterId].hosts = [];
    }

    // add the host in the "to delete" actions of our cluster
    self.clusterGroupActions[clusterGroupId].delete[clusterId].hosts.push(hostId);

    return self.clusterGroupActions;
  }

  /**
  * save cluster group actions
  *
  * @param {object} clusterGroupActions The json with all the actions
  */
  saveClusterGroupActions (clusterGroupActions) {
    this.clusterGroupActions = clusterGroupActions;
  }

  /**
  * get cluster group cluster group actions
  *
  * @return {object} this.clusterGroupActions The json with all the actions
  */
  getClusterGroupActions () {
    return this.clusterGroupActions;
  }

  /**
  * handle scroll bar for the host list
  */
  handleHostListScroll () {
    const scrollPosition = $('#ccm-host_list').scrollTop();
    const resultHeight = $('#ccm-host_list > div').length * 40;
    const maxHostListHeight = $(window).height() - 80 - $(window).height() * 0.08;

    // when few results are shown, reduce div height and don't display scroll indicators
    if (resultHeight < $('#ccm-host_list').height()) {
      $('#ccm-host_list').css('height', resultHeight);
      $('#bottom_overlay_icon').css('display', 'none');
      $('#bottom_overlay').css('box-shadow', '0px 0px 0px 0px rgba(0,0,0,0.65)');
      $('#bottom_overlay').css('border-top', '0px solid #e0c7c1');
      $('#top_overlay_icon').css('display', 'none');
      $('#top_overlay').css('box-shadow', '0px 0px 0px 0px rgba(0,0,0,0.65)');
      $('#top_overlay').css('border-bottom', '0px solid #e0c7c1');
    } else if (resultHeight > $('#ccm-host_list').height() && resultHeight <= maxHostListHeight) {
      $('#ccm-host_list').css('height', resultHeight);
      $('#bottom_overlay_icon').css('display', 'none');
      $('#bottom_overlay').css('box-shadow', '0px 0px 0px 0px rgba(0,0,0,0.65)');
      $('#bottom_overlay').css('border-top', '0px solid #e0c7c1');
      $('#top_overlay_icon').css('display', 'none');
      $('#top_overlay').css('box-shadow', '0px 0px 0px 0px rgba(0,0,0,0.65)');
      $('#top_overlay').css('border-bottom', '0px solid #e0c7c1');
    }

    // if many results are shown, limit size of div to 601px
    if ($('#ccm-host_list > div').length * 40 > maxHostListHeight) {
      $('#ccm-host_list').css('height', maxHostListHeight + 'px');
      const scrollHeight = $('#ccm-host_list')[0].scrollHeight - $('#ccm-host_list').height();

      // initiate scroll icon display depending on the scroll bar position
      if (scrollPosition !== 0 && scrollPosition !== scrollHeight) {
        $('#bottom_overlay_icon').css('display', 'table-cell');
        $('#bottom_overlay').css('box-shadow', '0px -2px 10px 0px rgba(0,0,0,0.65)');
        $('#bottom_overlay').css('border-top', '1px solid #e0c7c1');
        $('#top_overlay_icon').css('display', 'table-cell');
        $('#top_overlay').css('box-shadow', '0px 2px 10px 0px rgba(0,0,0,0.65)');
        $('#top_overlay').css('border-bottom', '1px solid #e0c7c1');
      } else if (scrollPosition === 0 && scrollPosition !== scrollHeight) {
        $('#top_overlay_icon').css('display', 'none');
        $('#top_overlay').css('box-shadow', '0px 0px 0px 0px rgba(0,0,0,0.65)');
        $('#top_overlay').css('border-bottom', '0px solid #e0c7c1');
        $('#bottom_overlay_icon').css('display', 'table-cell');
        $('#bottom_overlay').css('box-shadow', '0px -2px 10px 0px rgba(0,0,0,0.65)');
        $('#bottom_overlay').css('border-top', '1px solid #e0c7c1');
      } else if (scrollPosition !== 0 && scrollPosition === scrollHeight) {
        $('#bottom_overlay_icon').css('display', 'none');
        $('#bottom_overlay').css('box-shadow', '0px 0px 0px 0px rgba(0,0,0,0.65)');
        $('#bottom_overlay').css('border-top', '0px solid #e0c7c1');
        $('#top_overlay_icon').css('display', 'table-cell');
        $('#top_overlay').css('box-shadow', '0px 2px 10px 0px rgba(0,0,0,0.65)');
        $('#top_overlay').css('border-bottom', '1px solid #e0c7c1');
      }
    }

    // when through the host list, display scroll icon depending on scroll position
    const scrollHeight = $('#ccm-host_list')[0].scrollHeight - $('#ccm-host_list').height();
    $('#ccm-host_list').scroll(function () {
      let scrollPosition = $('#ccm-host_list').scrollTop();

      // dirty fix because scrollPosition may be stuck 0.x px before scrollHeight meaning that it reached the bottom
      if (scrollPosition > scrollHeight - 1) {
        scrollPosition = scrollHeight;
      }

      if (scrollPosition === 0) {
        $('#top_overlay_icon').css('display', 'none');
        $('#top_overlay').css('box-shadow', '0px 0px 0px 0px rgba(0,0,0,0.65)');
        $('#top_overlay').css('border-bottom', '0px solid #e0c7c1');
      } else {
        $('#top_overlay_icon').css('display', 'table-cell');
        $('#top_overlay').css('box-shadow', '0px 2px 10px 0px rgba(0,0,0,0.65)');
        $('#top_overlay').css('border-bottom', '1px solid #e0c7c1');
      }

      if (scrollPosition === scrollHeight && scrollHeight >= 0) {
        $('#bottom_overlay_icon').css('display', 'none');
        $('#bottom_overlay').css('box-shadow', '0px 0px 0px 0px rgba(0,0,0,0.65)');
        $('#bottom_overlay').css('border-top', '0px solid #e0c7c1');
      } else if (scrollHeight > 0 && scrollPosition !== scrollHeight) {
        $('#bottom_overlay_icon').css('display', 'table-cell');
        $('#bottom_overlay').css('box-shadow', '0px -2px 10px 0px rgba(0,0,0,0.65)');
        $('#bottom_overlay').css('border-top', '1px solid #e0c7c1');
      }
    });
  }

  /**
  * create a drop area in a cluster group that will create a new cluster in the cluster group
  *
  * @param {string} clusterGroupId The Id of the cluster group in which we have to create the drop area
  */
}
