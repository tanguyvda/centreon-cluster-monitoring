$(document).ready(function () {
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
          if (key !== 'row_count') {
            console.log(data[key].host_name);
            $('#host_list > tbody:last-child').append('<tr><td>' + data[key].host_name + '</td></tr>');
          }
        }
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
