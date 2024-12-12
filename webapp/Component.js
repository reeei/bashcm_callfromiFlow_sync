sap.ui.define([
    "sap/ui/core/UIComponent",
    "jeuplfromiflow/journalentryuploadfromiflow/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("jeuplfromiflow.journalentryuploadfromiflow.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

            // var jQueryScript = document.createElement('script');
			// jQueryScript.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
			// document.head.appendChild(jQueryScript);

            // var jQueryScript = document.createElement('script');
			// jQueryScript.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');
			// document.head.appendChild(jQueryScript);

            var jQueryScript = document.createElement('script');
			jQueryScript.setAttribute('src', 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.js');
			document.head.appendChild(jQueryScript);
        }
    });
});