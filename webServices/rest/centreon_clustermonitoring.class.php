<?php

require_once _CENTREON_PATH_ . '/www/class/centreonDB.class.php';
require_once _CENTREON_PATH_ . '/www/api/class/webService.class.php';

define('CCM_PATH', _CENTREON_PATH_ . '/www/modules/centreon-cluster-monitoring');

class CentreonClustermonitoring extends CentreonWebService
{
    protected $pearDB = null;

    public function postCcmData()
    {
        if (!isset($this->arguments['ccm_method'])) {
            throw new RestBadRequestException('class not found');
        }

        include_once CCM_PATH . '/core/class/ccm.class.php';

        if (!method_exists('ccm', $this->arguments['ccm_method'])) {
            throw new RestBadRequestException('Method ' . $this->arguments['ccm_method'] . ' does not exist');
        }

        try {
            $ccm = new ccm;
            $result = $ccm->listHosts();
        } catch (\Exception $e) {
            throw new RestBadRequestException($e->getMessage());
        }

        return $result;
    }
}
