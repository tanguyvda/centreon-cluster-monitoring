<?php

require_once _CENTREON_PATH_ . "/www/class/centreonDB.class.php";

class ccm
{
    public function __construct()
    {
        $this->db = new centreonDB();
    }

    /**
    * get list of hosts
    *
    * @return array with hosts list
    */
    public function listHosts() {
        global $centreon;
        $userId = $centreon->user->user_id;
        $isAdmin = $centreon->user->admin;
        $file = fopen("/var/opt/rh/rh-php72/log/php-fpm/ccm_session", "a") or die ("Unable to open file!");
        fwrite($file, print_r($centreon->user,true));
        fclose($file);
        $query = "SELECT SQL_CALC_FOUND_ROWS host_id, host_name, host_address, host_alias, host_comment" .
            " FROM host WHERE host_register='1'";

        if (!$isAdmin) {
            $acl = new CentreonACL($userId, $isAdmin);
            $query .= ' AND host_id IN (' . $acl->getHostString('ID', $this->db) . ')';
        }

        $res = $this->db->prepare($query);
        $res->execute();

        while ($row = $res->fetch()) {
            $hostList[] = $row;
        }

        $hostList['row_count'] = $this->db->numberRows();

        return $hostList;
    }

    /**
    * search through list
    *
    * @param array data and options list
    *
    * @return array with data that matched pattern
    */
    public function searchList($data) {
        ini_set('pcre.backtrack_limit', 50000);
        $result = [];
        $pattern = htmlentities($data['search_value'], ENT_QUOTES);

        foreach ($data['data'] as $key => $value) {
            if (preg_grep("/" . $pattern . "/", $value)) {
                $result[] = $value;
            }
        }
        
        return $result;
    }
}
