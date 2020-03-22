<?php

require_once _CENTREON_PATH_ . '/www/class/centreonDB.class.php';
require_once _CENTREON_PATH_ . '/www/class/centreonHost.class.php';
require_once _CENTREON_PATH_ . '/www/class/centreonMedia.class.php';

class ccm
{
    public function __construct()
    {
        $this->db = new centreonDB();
    }

    /**
    * get list of hosts
    *
    * @return array $hostList with hosts list
    */
    public function listHosts() {
        global $centreon;
        $mediaObj = new CentreonMedia($this->db);
        $hostObj = new CentreonHost($this->db);
        $userId = $centreon->user->user_id;
        $isAdmin = $centreon->user->admin;
        $ehiCache = $this->_getHostIcon();
        $query = "SELECT host_id, host_name, host_address, host_alias, host_comment" .
            " FROM host WHERE host_register='1'";

        if (!$isAdmin) {
            $acl = new CentreonACL($userId, $isAdmin);
            $query .= ' AND host_id IN (' . $acl->getHostString('ID', $this->db) . ')';
        }

        $res = $this->db->prepare($query);
        $res->execute();

        while ($row = $res->fetch()) {
            $row['icon'] = './img/icons/host.png';

            if (isset($ehiCache[$row['host_id']]) && $ehiCache[$row['host_id']]) {
                $row['icon'] = './img/media/' . $mediaObj->getFilename($ehiCache[$row['host_id']]);
            } else {
                $icon = $hostObj->replaceMacroInString($row['host_id'], getMyHostExtendedInfoImage($row['host_id'],
                    'ehi_icon_image', 1));

                if ($icon) {
                    $row['icon'] = './img/media/' . $icon;
                }
            }

            $hostList[] = $row;
        }

        return $hostList;
    }

    /**
    * search through list
    *
    * @param array $data data and options list
    *
    * @return array $result with data that matched pattern
    */
    public function searchList($data) {
        ini_set('pcre.backtrack_limit', 50000);
        $result = [];
        $pattern = htmlentities($data['search_value'], ENT_QUOTES);
        $i = 0;

        foreach ($data['data'] as $key => $value) {
            $dataWithoutIcon[] = array(
                'host_id' => $value['host_id'],
                'host_name' => $value['host_name'],
                'host_address' => $value['host_address'],
                'host_alias' => $value['host_alias'],
                'host_comment' => $value['host_comment']
            );


            if (preg_grep("/" . $pattern . "/", $dataWithoutIcon[$i])) {
                $dataWithoutIcon[$i]['icon'] = $value['icon'];
                $result[] = $dataWithoutIcon[$i];
            }
            $i++;
        }

        return $result;
    }

    /**
    * get host icons
    *
    * @return array $ehiCache list of host icon
    */
    protected function _getHostIcon() {
        $query = 'SELECT ehi_icon_image, host_host_id FROM extended_host_information';
        $res = $this->db->prepare($query);
        $res->execute();

        while ($row = $res->fetch()) {
            $ehiCache[$ehi['host_host_id']] = $ehi['ehi_icon_image'];
        }

        return $ehiCache;
    }
}
