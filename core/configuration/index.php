<?php

// require_once realpath(dirname(__FILE__) . '/../../../../config/centreon.config.php');

$path = $centreon_path . 'www/modules/centreon-cluster-monitoring/core/configuration/';
$template = new Smarty();
$template = initSmartyTplForPopup($path, $template, './', $centreon_path);
$template->display('index.ihtml');
