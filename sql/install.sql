--
-- topology of the module
--
INSERT INTO `topology` (`topology_name`, `topology_parent`, `topology_page`, `topology_order`,
`topology_group`, `topology_url`, `topology_url_opt`, `topology_popup`, `topology_modules`, `topology_show`,
`topology_style_class`, `topology_style_id`, `topology_OnClick`) VALUES
('Cluster Monitoring', 2, 260, 70, 1, './modules/centreon-cluster-monitoring/core/status/index.php', NULL, '0', '1', '1', NULL, NULL, NULL),
('Clusters status', 260, 26001, 71, 1, './modules/centreon-cluster-monitoring/core/status/index.php', NULL, NULL, '1', '1', NULL, NULL, NULL),
('Clusters configuration', 260, 26002, 72, 1, './modules/centreon-cluster-monitoring/core/configuration/index.php', NULL, NULL, '1', '1', NULL, NULL, NULL),
('Clusters type list', 260, 26003, 73, 1, './modules/centreon-cluster-monitoring/core/configuration/index.php', NULL, NULL, '1', '1', NULL, NULL, NULL);


--
-- cluster configuration table
--
CREATE TABLE IF NOT EXISTS `mod_ccm_cluster` (
  `cluster_id` INT(11) NOT NULL AUTO_INCREMENT,
  `cluster_name` VARCHAR(255) DEFAULT NULL,
  `cluster_group_id` INT(11) DEFAULT NULL,
  `warning_threshold` INT(11) DEFAULT NULL,
  `critical_threshold` INT(11) DEFAULT NULL,
  `inherit_downtime` BOOLEAN DEFAULT true,
  `inherit_ack` BOOLEAN DEFAULT true,
  `ignore_services` BOOLEAN DEFAULT false,
  `cluster_type_id` INT(11) DEFAULT NULL,
  PRIMARY KEY (`cluster_id`),
  KEY `cluster_group_id` (`cluster_group_id`),
  KEY `cluster_type_id` (`cluster_type_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- cluster and host relation table
--
CREATE TABLE IF NOT EXISTS `mod_ccm_cluster_host_relation` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `cluster_id` INT(11) DEFAULT NULL,
  `host_id` INT(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cluster_id` (`cluster_id`),
  KEY `host_id` (`host_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- cluster group configuration
--
CREATE TABLE IF NOT EXISTS `mod_ccm_cluster_group` (
  `cluster_group_id` INT(11) NOT NULL AUTO_INCREMENT,
  `cluster_group_name` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`cluster_group_id`),
  UNIQUE KEY `cluster_group_name` (`cluster_group_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- cluster type configuration
--
CREATE TABLE IF NOT EXISTS `mod_ccm_cluster_type` (
  `cluster_type_id` INT(11) NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) DEFAULT NULL,
  `thumbnail` VARCHAR(255) DEFAULT NULL,
  `icon` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`cluster_type_id`),
  KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- create constraints
--
ALTER TABLE `mod_ccm_cluster`
  ADD CONSTRAINT `mod_ccm_cluster_ibfk_1` FOREIGN KEY (`cluster_type_id`) REFERENCES `mod_ccm_cluster_type` (`cluster_type_id`) ON DELETE SET NULL,
  ADD CONSTRAINT `mod_ccm_cluster_ibfk_2` FOREIGN KEY (`cluster_group_id`) REFERENCES `mod_ccm_cluster_group` (`cluster_group_id`) ON DELETE CASCADE;

ALTER TABLE `mod_ccm_cluster_host_relation`
  ADD CONSTRAINT `mod_ccm_cluster_host_relation_ibfk_1` FOREIGN KEY (`cluster_id`) REFERENCES `mod_ccm_cluster` (`cluster_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `mod_ccm_cluster_host_relation_ibfk_2` FOREIGN KEY (`host_id`) REFERENCES `host` (`host_id`) ON DELETE CASCADE;
