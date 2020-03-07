--
-- Remove topology
--
DELETE FROM topology where `topology_parent`=260;
DELETE FROM topology where `topology_page`=260;

--
-- Remove forein keys
--
ALTER TABLE `mod_ccm_cluster` DROP FOREIGN KEY mod_ccm_cluster_ibfk_1;
ALTER TABLE `mod_ccm_cluster` DROP FOREIGN KEY mod_ccm_cluster_ibfk_2;

ALTER TABLE `mod_ccm_cluster_host_relation` DROP FOREIGN KEY mod_ccm_cluster_host_relation_ibfk_1;
ALTER TABLE `mod_ccm_cluster_host_relation` DROP FOREIGN KEY mod_ccm_cluster_host_relation_ibfk_2;

--
-- Drop tables
--
DROP TABLE `mod_ccm_cluster_type`;
DROP TABLE `mod_ccm_cluster_group`;
DROP TABLE `mod_ccm_cluster`;
DROP TABLE `mod_ccm_cluster_host_relation`;
