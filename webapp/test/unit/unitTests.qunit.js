/* global QUnit */
// https://api.qunitjs.com/config/autostart/
QUnit.config.autostart = false;

sap.ui.require([
	"jeupl_fromiflow/journalentryupload_fromiflow/test/unit/AllTests"
], function (Controller) {
	"use strict";
	QUnit.start();
});