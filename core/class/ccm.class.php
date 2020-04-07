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
        $userId = $centreon->user->user_id;
        $isAdmin = $centreon->user->admin;
        $query = "SELECT host_id, host_name, host_address, host_alias, host_comment" .
            " FROM host WHERE host_register='1'";

        if (!$isAdmin) {
            $acl = new CentreonACL($userId, $isAdmin);
            $query .= ' AND host_id IN (' . $acl->getHostString('ID', $this->db) . ')';
        }

        $res = $this->db->prepare($query);
        $res->execute();

        while ($row = $res->fetch()) {
            $hostList[] = $this->_associateHostWithIcon($row);
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
        $clusterGroupName = $conf['cluster_group_name'];
        $inheritDt = $conf['statusCalculation']['inherit_downtime'] == 1 ?
            $conf['statusCalculation']['inherit_downtime'] : 0;
        $inheritAck = $conf['statusCalculation']['inherit_ack'] == 1 ? $conf['statusCalculation']['inherit_ack'] : 0;
        $ignoreServices = $conf['statusCalculation']['ignore_services'] == 1 ? 1 : 0;
        $clusterName = $conf['clusters'][0]['cluster_name'];
        $warningThreshold = $conf['clusters'][0]['warning_threshold'];
        $criticalThreshold = $conf['clusters'][0]['critical_threshold'];

        $query = "INSERT INTO mod_ccm_cluster_group (`cluster_group_name`, `inherit_downtime`, `inherit_ack`" .
            ", `ignore_services`) VALUE (:pdo_clusterGroupName, " . $inheritDt . ", " . $inheritAck .
            ", " . $ignoreServices . ")";
        $res = $this->db->prepare($query);
        $res->bindValue(':pdo_clusterGroupName', (string)$clusterGroupName, PDO::PARAM_STR);

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
            'clusterGroupName' => array(
                'type' => 'string',
                'value' => $clusterGroupName
            ),
            'clusterName' => array (
                'type' => 'string',
                'value' => $clusterName
            ),
            'warningThreshold' => array(
                'type' => 'int',
                'value' => $warningThreshold
            ),
            'criticalThreshold' => array(
                'type' => 'int',
                'value' => $criticalThreshold
            )
        );

        $query = "INSERT INTO mod_ccm_cluster (`cluster_name`,`cluster_group_id`,`warning_threshold`," .
            " `critical_threshold`) VALUE (" .
            " :pdo_clusterName, (SELECT cluster_group_id FROM mod_ccm_cluster_group" .
            " WHERE `cluster_group_name` = :pdo_clusterGroupName), :pdo_warningThreshold, :pdo_criticalThreshold)";

        foreach ($pdoParams as $key => $param) {
            $mainQueryParameters[] = [
                'parameter' => ':pdo_' . $key,
                'value' => ($param['type'] == 'int' ? (int)$param['value'] : (string)$param['value']),
                'type' => ($param['type'] == 'int' ? PDO::PARAM_INT : PDO::PARAM_STR)
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
    * link a host with its icon
    *
    * @param array $host host data
    *
    * @return $host host data with its icon
    */
    protected function _associateHostWithIcon($host) {
        $hostObj = new CentreonHost($this->db);
        $mediaObj = new CentreonMedia($this->db);
        $ehiCache = $this->_getHostIcon();
        $host['icon'] = './img/icons/host.png';

        if (isset($ehiCache[$host['host_id']]) && $ehiCache[$host['host_id']]) {
            $host['icon'] = './img/media/' . $mediaObj->getFilename($ehiCache[$host['host_id']]);
        } else {
            $icon = $hostObj->replaceMacroInString($host['host_id'], getMyHostExtendedInfoImage($host['host_id'],
                'ehi_icon_image', 1));

            if ($icon) {
                $host['icon'] = './img/media/' . $icon;
            }
        }

        return $host;
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
        $i = 0;
        foreach ($clustersName as $name) {
            $labels[] = ':pdo_name_' . $i;
            $mainQueryParameters[] = [
                'parameter' => ':pdo_name_' . $i,
                'value' => (string)$name,
                'type' => PDO::PARAM_STR
            ];
            $i++;
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

    /**
    * Get cluster groups configuration
    *
    * @return array cluster group configuration
    *
    * throw \Exception if we can't reach Database
    */
    public function loadClusterGroups() {
        $clusterGroups = $this->_getClusterGroups();

        if (!$clusterGroups) {
            return "no cluster group found";
        }

        $i = 0;
        foreach ($clusterGroups as $clusterGroup) {
            $clusterGroupsConfiguration[$i] = [
                'cluster_group_id' => $clusterGroup['cluster_group_id'],
                'cluster_group_name' => $clusterGroup['cluster_group_name'],
                'statusCalculation' => [
                    'inherit_downtime' => $clusterGroup['inherit_downtime'],
                    'inherit_ack' => $clusterGroup['inherit_ack'],
                    'ignore_services' => $clusterGroup['ignore_services']
                ]
            ];

            $j = 0;
            $clusters = $this->_getClustersConfiguration(array($clusterGroup['cluster_group_id']));
            foreach ($clusters as $cluster) {
                $clusterGroupsConfiguration[$i]['clusters'][$j] = $cluster;
                $hosts = $this->_getClustersHosts(array($cluster['cluster_id']));
                $clusterGroupsConfiguration[$i]['clusters'][$j]['hosts'] = $hosts;
                $j++;
            }
            $i++;
        }

        return $clusterGroupsConfiguration;
    }

    /**
    * get list of cluster groups
    *
    * @return array $clusterGroup list of cluster groups
    *
    * throw \Exception if we can't reach database
    */
    protected function _getClusterGroups() {
        $query = "SELECT cluster_group_id, cluster_group_name, inherit_downtime, inherit_ack, ignore_services" .
            " FROM mod_ccm_cluster_group";
        $res = $this->db->prepare($query);

        try {
            $res->execute();
        } catch (\Exception $e) {
            throw new \Exception($e->getMessage(), $e->getCode());
        }

        while ($row = $res->fetch()) {
            $clusterGroup[] = $row;
        }

        if (empty($clusterGroup)) {
            return false;
        }

        return $clusterGroup;
    }

    /**
    * get clusters configuration
    *
    * @param array $clusterGroupsId id of cluster group, default = null
    *
    * @return array $clustersConfiguration the wanted clusters configuration
    *
    * throw \Exception if we can't reach the database
    */
    protected function _getClustersConfiguration($clusterGroupsId = null) {
        if (is_array($clusterGroupsId) && !empty($clusterGroupsId)) {
            foreach ($clusterGroupsId as $id) {
                $idList[] = ':pdo_' . $id;
                $mainQueryParameters[] = [
                    'parameter' => ':pdo_' . $id,
                    'value' => (int)$id,
                    'type' => PDO::PARAM_INT
                ];
            }
        }

        $query = "SELECT cluster_id, cluster_name, cluster_group_id, warning_threshold, critical_threshold," .
        " cluster_type_id FROM mod_ccm_cluster";
        if (is_array($clusterGroupsId) && !empty($clusterGroupsId)) {
            $query .= " WHERE cluster_group_id IN (" . implode(', ', $idList) . ")";
        }

        $res = $this->db->prepare($query);

        if (is_array($clusterGroupsId) && !empty($clusterGroupsId)) {
            foreach ($mainQueryParameters as $param) {
                $res->bindValue($param['parameter'], $param['value'], $param['type']);
            }
        }

        try {
            $res->execute();
        } catch (\Exception $e) {;
            throw new \Exception($e->getMessage(), $e->getCode());
        }

        while ($row = $res->fetch()) {
            $clustersConfiguration[] = $row;
        }

        return $clustersConfiguration;
    }

    /**
    * get hosts link to cluster
    *
    * @param array $clustersId list of cluster, default null
    *
    * @return array $hosts list of hosts
    *
    * @throw \Exception if we can't reach database
    */
    protected function _getClustersHosts($clustersId = null) {
        if (is_array($clustersId) && !empty($clustersId)) {
            foreach ($clustersId as $id) {
                $idList[] = ':pdo_' . $id;
                $mainQueryParameters[] = [
                    'parameter' => ':pdo_' . $id,
                    'value' => (int)$id,
                    'type' => PDO::PARAM_INT
                ];
            }
        }

        $query = "SELECT host_id, host_name, host_alias, host_address, host_comment FROM host" .
            " WHERE host_register='1' AND host_id IN (SELECT host_id FROM mod_ccm_cluster_host_relation";

        if (is_array($clustersId) && !empty($clustersId)) {
            $query .= " WHERE cluster_id IN (" . implode(', ', $idList) . ")";
        }

        $query .= ")";
        $res = $this->db->prepare($query);

        if (is_array($clustersId) && !empty($clustersId)) {
            foreach ($mainQueryParameters as $param) {
                $res->bindValue($param['parameter'], $param['value'], $param['type']);
            }
        }

        try {
            $res->execute();
        } catch (\Exception $e) {
            throw new \Exception($e->getMessage(), $e->getCode());
        }

        while ($row = $res->fetch()) {
            $hosts[] = $this->_associateHostWithIcon($row);
        }

        return $hosts;
    }

    public function updateClusterGroup($data) {
        $delete = $data['actions']['delete'];
        $add = $data['actions']['add'];
        foreach ($delete as $key => $value) {
            if ($key == 'clusters' && !empty($delete['clusters'])) {

                foreach ($delete[$key] as $cluster) {
                    $clusterId[] = ':pdo_' . $cluster;
                    $mainQueryParameters[] = [
                        'parameter' => ':pdo_' . $cluster,
                        'value' => (int)$cluster,
                        'type' => PDO::PARAM_INT
                    ];
                }
                $query = "DELETE FROM mod_ccm_cluster WHERE cluster_id IN (" . implode(', ', $clusterId) . ")";
                $res = $this->db->prepare($query);

                foreach ($mainQueryParameters as $param) {
                    $res->bindValue($param['parameter'], $param['value'], $param['type']);
                }

                unset($mainQueryParameters);

                try {
                    $res->execute();
                } catch (\Exception $e) {
                    throw new \Exception($e->getMessage(), $e->getCode());
                }

            } else if ($key != 'clusters') {
                if (!in_array($key, $delete['clusters'])) {
                    foreach ($delete[$key]['hosts'] as $host) {
                        $hostId[] = ':pdo_' . $host;
                        $mainQueryParameters[] = [
                            'parameter' => ':pdo_' . $host,
                            'value' => (int)$host,
                            'type' => PDO::PARAM_INT
                        ];
                    }

                    $query = "DELETE FROM mod_ccm_cluster_host_relation WHERE cluster_id = :pdo_" . $key .
                    " AND host_id IN (" . implode(', ', $hostId) . ")";
                    $res = $this->db->prepare($query);

                    foreach ($mainQueryParameters as $param) {
                        $res->bindValue($param['parameter'], $param['value'], $param['type']);
                    }
                    $res->bindValue(':pdo_' . $key, (int)$key, PDO::PARAM_INT);

                    unset($mainQueryParameters);

                    try {
                        $res->execute();
                    } catch (\Exception $e) {
                        throw new \Exception($e->getMessage(), $e->getCode());
                    }
                }
            }
        }

        foreach ($add as $key => $value) {
            $query = 'INSERT INTO mod_ccm_cluster_host_relation (`cluster_id`, `host_id`) VALUES';

            foreach ($add[$key]['hosts'] as $host) {
                $mainQueryParameters[] = [
                    'parameter' => ':pdo_' . $host,
                    'value' => (int)$host,
                    'type' => PDO::PARAM_INT
                ];

                $query .= " (:id_" . $key . ", :pdo_" . $host . "),";
            }

            $query = rtrim($query, ',');
            $res = $this->db->prepare($query);

            foreach ($mainQueryParameters as $param) {
                $res->bindValue($param['parameter'], $param['value'], $param['type']);
            }

            $res->bindValue(':id_' . $key, (int)$key, PDO::PARAM_INT);

            unset($mainQueryParameters);

            try {
                $res->execute();
            } catch (\Exception $e) {
                throw new \Exception($e->getMessage(), $e->getCode());
            }
        }

        return true;
    }
}
