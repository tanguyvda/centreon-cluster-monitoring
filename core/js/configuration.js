$(document).ready(function () {
  $('.tooltipped').tooltip();
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
        var hostList = [];
        for (const key in data) {
          if (key !== 'row_count') {
            $('#host_list > tbody:last-child').append('<tr><td>' + data[key].host_name + '</td></tr>');
            hostList.push(
              {
                host_id: data[key].host_id,
                host_name: data[key].host_name,
                host_address: data[key].host_address,
                host_alias: data[key].host_alias,
                host_comment: data[key].host_comment
              }
            );
          }
        }
        startSearchHost(data);
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
  var fuseOptions = {
    keys: ['host_name'],
    id: 'host_name',
    location: 0,
    distance: 5
    // includeScore: true,
    // includeMatches: true
  };
  $('#search_host').change(function () {
    // var fuse = new Fuse(data, fuseOptions);
    // let searchResult = fuse.search($('#search_host').val());
    // $('#host_list_tbody').empty();
    // for (let key in searchResult) {
    //   $('#host_list > tbody:last-child').append('<tr><td>' + searchResult[key] + '</td></tr>');
    // }
    $.ajax({
      url: './api/internal.php?object=centreon_clustermonitoring&action=CcmData',
      type: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        ccm_method: 'searchList',
        data: data,
        fields: ['host_name', 'host_address'],
        search_value: $('#search_host').val()
      }),
      success: function (data) {
        $('#host_list_tbody').empty();
        for (const key in data) {
          $('#host_list > tbody:last-child').append('<tr><td>' + data[key].host_name + '</td></tr>');
        }
        console.log(data);
      },
      error: function (error) {
        console.log('very bad');
        console.log(error);
      }
    });
    // console.log(searchResult);
  });
}
