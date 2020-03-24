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
    * save cluster group configuration in database
    *
    * @param array $conf cluster group configuration data
    *
    * @return bool
    *
    * throw \Exception if we can't reach database
    */
    public function saveClusterGroup($data) {
        $conf = $data['param'];
        $clusterGroupName = $conf['clusterGroupName'];
        $inheritDt = $conf['statusCalculation']['inheritDt'] == 1 ? $conf['statusCalculation']['inheritDt'] : 0;
        $inheritAck = $conf['statusCalculation']['inheritAck'] == 1 ? $conf['statusCalculation']['inheritAck'] : 0;
        $ignoreServices = $conf['statusCalculation']['statusCalculationMethod'] == 'service' ? 0 : 1;
        $clusterName = $conf['clusters'][0]['name'];
        $warningThreshold = $conf['clusters'][0]['warningThreshold'];
        $criticalThreshold = $conf['clusters'][0]['criticalThreshold'];

        $query = "INSERT INTO mod_ccm_cluster_group (`cluster_group_name`) VALUE (:pdo_" . $clusterGroupName . ")";

        $res = $this->db->prepare($query);
        $res->bindValue(':pdo_' . $clusterGroupName, (string)$clusterGroupName, PDO::PARAM_STR);
        try {
            $res->execute();
        } catch (\Exception $e) {
            if ($res->errorCode() == 23000) {
                throw new \Exception('Cluster group ' . $clusterGroupName . ' already exists');
            } else {
                throw new \Exception($e->getMessage(), $e->getCode());
            }
        }

        $pdoParams =  array(
            $clusterName => 'string',
            $clusterGroupName => 'string',
            $warningThreshold => 'int',
            $criticalThreshold => 'int'
        );

        $query = "INSERT INTO mod_ccm_cluster (`cluster_name`,`cluster_group_id`,`warning_threshold`," .
            " `critical_threshold`, `inherit_downtime`, `inherit_ack`, `ignore_services`) VALUE (" .
            " :pdo_" . $clusterName . ", (SELECT cluster_group_id FROM mod_ccm_cluster_group" .
            " WHERE `cluster_group_name` = :pdo_" . $clusterGroupName . "), :pdo_" . $warningThreshold .
            ", :pdo_" . $criticalThreshold . ", " . $inheritDt . ", " . $inheritAck . ", " . $ignoreServices .")";

        foreach ($pdoParams as $key => $value) {
            $mainQueryParameters[] = [
                'parameter' => ':pdo_' . $key,
                'value' => ($value == 'int' ? (int)$key : (string)$key),
                'type' => ($value == 'int' ? PDO::PARAM_INT : PDO::PARAM_STR)
            ];
        }

        $res = $this->db->prepare($query);
        foreach ($mainQueryParameters as $param) {
            $res->bindValue($param['parameter'], $param['value'], $param['type']);
        }

        try {
            $res->execute();
        } catch (\Exception $e) {
            throw new \Exception($e->getMessage(), $e->getCode());
        }

        unset($mainQueryParameters);
        $clusterArray[] = $clusterName;
        $clusterId = $this->getClustersId($clusterArray);

        $query = "INSERT INTO mod_ccm_cluster_host_relation (`cluster_id`, `host_id`) VALUES";

        foreach ($conf['clusters'][0]['hosts'] as $host) {
            $query .= " (" . $clusterId[0]['id'] . ", :pdo_" . $host['host_id'] . "),";
            $mainQueryParameters[] = [
                'parameter' => ':pdo_' . $host['host_id'],
                'value' => (int)$host['host_id'],
                'type' => PDO::PARAM_INT
            ];
        }
        $query = rtrim($query, ',');
        $res = $this->db->prepare($query);
        foreach ($mainQueryParameters as $param) {
            $res->bindValue($param['parameter'], $param['value'], $param['type']);
        }
        $res->execute();

        return true;
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
            $ehiCache[$row['host_host_id']] = $row['ehi_icon_image'];
        }

        return $ehiCache;
    }

    /**
    * get clusters id
    *
    * @param array $clustersName list of clusters
    *
    * @return array $clustersId list of clusters id
    *
    * throw \Exception if we can't reach database
    */
    public function getClustersId($clustersName) {
        foreach ($clustersName as $name) {
            $labels[] = ':pdo_' . $name;
            $mainQueryParameters[] = [
                'parameter' => ':pdo_' . $name,
                'value' => (string)$name,
                'type' => PDO::PARAM_STR
            ];
        }

        $query = "SELECT cluster_id, cluster_name FROM mod_ccm_cluster WHERE cluster_name IN (" . implode(',', $labels) . ")";
        $res = $this->db->prepare($query);

        foreach ($mainQueryParameters as $param) {
            $res->bindValue($param['parameter'], $param['value'], $param['type']);
        }

        try {
            $res->execute();
        } catch (\Exception $e) {
            throw new \Exception($e->getMessage(), $e->getCode());
        }

        while ($row = $res->fetch()) {
            $clustersId[] = [
                'id' => $row['cluster_id'],
                'name' => $row['cluster_name']
            ];
        }

        return $clustersId;
    }
}
